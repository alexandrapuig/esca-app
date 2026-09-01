import { generateSpoilagePredictionsWithClaude } from './aiService';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

export type SpoilagePrediction = {
  item_id: string;
  risk_level: 'low' | 'medium' | 'high';
  days_until_expiry: number;
  spoilage_probability_percent: number;
  confidence_score: number;
  reasoning: string;
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

function riskFromDays(days: number): 'low' | 'medium' | 'high' {
  return days < 3 ? 'high' : days <= 7 ? 'medium' : 'low';
}

function fallbackPrediction(item: FridgeItemForPrediction): SpoilagePrediction {
  const now = Date.now();
  const expiryMs = item.estimated_expiry ? new Date(item.estimated_expiry).getTime() : now + 7 * 86400000;
  const days = Math.max(0, Math.ceil((expiryMs - now) / 86400000));

  const riskLevel: 'low' | 'medium' | 'high' = days < 3 ? 'high' : days <= 7 ? 'medium' : 'low';

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
}): Promise<{ success: true; data: SpoilagePrediction[] } | { success: false; status: number; error: string }> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data: items, error: itemsError } = await supabase
      .from('fridge_items')
      .select('id, user_id, name, category, estimated_expiry, quantity, unit')
      .eq('user_id', params.userId)
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
        risk_level: riskFromDays(days),
        days_until_expiry: days,
        spoilage_probability_percent: modelPrediction.spoilage_probability_percent,
        confidence_score: modelPrediction.confidence_score,
        reasoning: modelPrediction.reasoning,
      } satisfies SpoilagePrediction;
    });

    const upsertRows = normalized.map((prediction) => ({
      user_id: params.userId,
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

export async function getLatestPredictionsForUser(params: { userId: string }): Promise<{
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
      .select('fridge_item_id, risk_level, days_until_expiry, spoilage_probability_percent, confidence_score, reasoning')
      .eq('user_id', params.userId)
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
