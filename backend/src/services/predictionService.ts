import { generateSpoilagePredictionsWithClaude } from './aiService';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

export type SpoilagePrediction = {
  item_id: string;
  risk_level: 'low' | 'medium' | 'high';
  days_until_expiry: number;
  spoilage_probability_percent: number;
  confidence_score: number;
  reasoning: string;
  created_at?: string;
};

type SpoilagePredictionRow = Omit<SpoilagePrediction, 'item_id'> & {
  fridge_item_id: string;
};

type FridgeItemForPrediction = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  estimated_expiry: string | null;
  quantity: number | null;
  unit: string | null;
};

function daysUntil(expiry: string | null): number {
  const now = Date.now();
  const expiryMs = expiry ? new Date(expiry).getTime() : now + 7 * 86400000;
  return Math.max(0, Math.ceil((expiryMs - now) / 86400000));
}

/**
 * Days-until-expiry thresholds per category, as [high, medium]. Below the
 * first number is high risk, below the second is medium, otherwise low.
 *
 * A single date rule for everything meant raw chicken and dried pasta were
 * treated identically at the same day count, which was visible to users:
 * poultry four days out showed "Medium risk" beside reasoning text calling it
 * extremely perishable.
 *
 * MUST match the copy in the frontend inventory page. The same rule decides
 * what the inventory page displays and which items land in the recipe at-risk
 * pool, so changing one without the other makes them disagree.
 */
const RISK_THRESHOLDS: Record<string, [number, number]> = {
  seafood: [2, 4],
  meat: [3, 5],
  dairy: [3, 7],
  produce: [3, 7],
  bakery: [2, 5],
  beverage: [5, 14],
  frozen: [14, 45],
  pantry: [14, 45],
  other: [3, 7],
};

function riskFromDays(days: number, category: string | null): 'low' | 'medium' | 'high' {
  const [high, medium] = RISK_THRESHOLDS[category ?? 'other'] ?? [3, 7];

  return days < high ? 'high' : days <= medium ? 'medium' : 'low';
}

function fallbackPrediction(item: FridgeItemForPrediction): SpoilagePrediction {
  const now = Date.now();
  const expiryMs = item.estimated_expiry ? new Date(item.estimated_expiry).getTime() : now + 7 * 86400000;
  const days = Math.max(0, Math.ceil((expiryMs - now) / 86400000));

  const riskLevel = riskFromDays(days, item.category);

  return {
    item_id: item.id,
    risk_level: riskLevel,
    days_until_expiry: days,
    spoilage_probability_percent: riskLevel === 'high' ? 85 : riskLevel === 'medium' ? 55 : 20,
    confidence_score: 0.68,
    reasoning: 'Fallback heuristic based on estimated expiry date.',
  };
}

export async function generatePredictionsForUser(params: {
  userId: string;
  householdId: string;
}): Promise<{ success: true; data: SpoilagePrediction[] } | { success: false; status: number; error: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data: items, error: itemsError } = await supabase
      .from('fridge_items')
      .select('id, user_id, name, category, estimated_expiry, quantity, unit')
      .eq('household_id', params.householdId)
      .eq('status', 'fresh')
      .returns<FridgeItemForPrediction[]>();

    if (itemsError) {
      return {
        success: false,
        status: 500,
        error: 'Unable to load inventory for predictions',
      };
    }

    if (!items || items.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    let predictions: SpoilagePrediction[];

    try {
      predictions = await generateSpoilagePredictionsWithClaude(
        items.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          estimated_expiry: item.estimated_expiry,
          quantity: item.quantity,
          unit: item.unit,
        })),
      );
    } catch {
      predictions = items.map(fallbackPrediction);
    }

    const normalized = items.map((item) => {
      const modelPrediction = predictions.find((prediction) => prediction.item_id === item.id);

      if (!modelPrediction) {
        return fallbackPrediction(item);
      }

      // days_until_expiry and risk_level are arithmetic, not judgement.
      // Claude has repeatedly returned values inconsistent with the supplied
      // estimated_expiry, so they are computed here and its values discarded.
      const days = daysUntil(item.estimated_expiry);

      return {
        item_id: item.id,
        risk_level: riskFromDays(days, item.category),
        days_until_expiry: days,
        spoilage_probability_percent: modelPrediction.spoilage_probability_percent,
        confidence_score: modelPrediction.confidence_score,
        reasoning: modelPrediction.reasoning,
      } satisfies SpoilagePrediction;
    });

    const upsertRows = normalized.map((prediction) => ({
      user_id: params.userId,
      household_id: params.householdId,
      fridge_item_id: prediction.item_id,
      risk_level: prediction.risk_level,
      days_until_expiry: prediction.days_until_expiry,
      spoilage_probability_percent: prediction.spoilage_probability_percent,
      confidence_score: prediction.confidence_score,
      reasoning: prediction.reasoning,
    }));

    const { error: upsertError } = await supabase
      .from('spoilage_predictions')
      .insert(upsertRows);

    if (upsertError) {
      console.error('prediction insert failed', {
        userId: params.userId,
        rowCount: upsertRows.length,
        itemIds: upsertRows.map((row) => row.fridge_item_id),
        error: upsertError,
      });
      return {
        success: false,
        status: 500,
        error: 'Unable to save spoilage predictions',
      };
    }

    return {
      success: true,
      data: normalized,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unable to generate predictions',
    };
  }
}

export async function getLatestPredictionsForUser(params: { householdId: string }): Promise<{
  success: true;
  data: SpoilagePrediction[];
} | {
  success: false;
  status: number;
  error: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('latest_spoilage_predictions')
      .select('fridge_item_id, risk_level, days_until_expiry, spoilage_probability_percent, confidence_score, reasoning, created_at')
      .eq('household_id', params.householdId)
      .returns<SpoilagePredictionRow[]>();

    if (error) {
      return {
        success: false,
        status: 500,
        error: 'Unable to fetch predictions',
      };
    }

    return {
      success: true,
      data: (data ?? []).map(({ fridge_item_id, ...prediction }) => ({
        item_id: fridge_item_id,
        ...prediction,
      })),
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unable to fetch predictions',
    };
  }
}
