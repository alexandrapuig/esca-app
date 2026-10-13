import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

/**
 * Records that a user set an expiry date different from the one we computed.
 *
 * Nothing reads this yet. It exists so that a pattern -- "spinach is always
 * four days, not the seven we guess" -- has history to be found in later.
 * Shelf life is written once at creation and never revised by use, so without
 * this the same wrong estimate repeats indefinitely.
 *
 * Deliberately never throws: a failure to log must not fail the save the user
 * actually asked for.
 */
export async function recordExpiryCorrection(params: {
  householdId: string;
  userId: string;
  fridgeItemId: string | null;
  itemName: string;
  category: string | null;
  barcode: string | null;
  estimatedExpiry: string | null;
  estimateSource: 'shelf_life' | 'category_default' | 'unknown';
  correctedExpiry: string;
  stage: 'create' | 'edit';
}): Promise<void> {
  try {
    // No estimate means nothing to be wrong about.
    if (!params.estimatedExpiry || params.estimatedExpiry === params.correctedExpiry) {
      return;
    }

    const estimated = Date.parse(`${params.estimatedExpiry}T00:00:00Z`);
    const corrected = Date.parse(`${params.correctedExpiry}T00:00:00Z`);

    if (Number.isNaN(estimated) || Number.isNaN(corrected)) {
      return;
    }

    // Negative means the real date was sooner than we guessed, which is the
    // direction that causes waste.
    const deltaDays = Math.round((corrected - estimated) / (24 * 60 * 60 * 1000));

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from('expiry_corrections').insert({
      household_id: params.householdId,
      user_id: params.userId,
      fridge_item_id: params.fridgeItemId,
      item_name: params.itemName,
      category: params.category,
      barcode: params.barcode,
      estimated_expiry: params.estimatedExpiry,
      estimate_source: params.estimateSource,
      corrected_expiry: params.correctedExpiry,
      delta_days: deltaDays,
      corrected_at_stage: params.stage,
    });

    if (error) {
      console.error('recordExpiryCorrection failed', { itemName: params.itemName, error });
    }
  } catch (error) {
    console.error('recordExpiryCorrection threw', error);
  }
}
