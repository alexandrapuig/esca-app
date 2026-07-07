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

type FridgeItemForPrediction = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  estimated_expiry: string | null;
  quantity: number | null;
  unit: string | null;
};

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

      return {
        item_id: item.id,
        risk_level: modelPrediction.risk_level,
        days_until_expiry: modelPrediction.days_until_expiry,
        spoilage_probability_percent: modelPrediction.spoilage_probability_percent,
        confidence_score: modelPrediction.confidence_score,
        reasoning: modelPrediction.reasoning,
      } satisfies SpoilagePrediction;
    });

    const upsertRows = normalized.map((prediction) => ({
      user_id: params.userId,
      item_id: prediction.item_id,
      risk_level: prediction.risk_level,
      days_until_expiry: prediction.days_until_expiry,
      spoilage_probability_percent: prediction.spoilage_probability_percent,
      confidence_score: prediction.confidence_score,
      reasoning: prediction.reasoning,
      predicted_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase.from('spoilage_predictions').upsert(upsertRows, {
      onConflict: 'item_id',
    });

    if (upsertError) {
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
      .from('spoilage_predictions')
      .select('item_id, risk_level, days_until_expiry, spoilage_probability_percent, confidence_score, reasoning')
      .eq('user_id', params.userId)
      .order('predicted_at', { ascending: false })
      .returns<SpoilagePrediction[]>();

    if (error) {
      return {
        success: false,
        status: 500,
        error: 'Unable to fetch predictions',
      };
    }

    return {
      success: true,
      data: data ?? [],
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unable to fetch predictions',
    };
  }
}
