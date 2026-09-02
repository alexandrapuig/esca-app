import axios from 'axios';

import { estimateShelfLifeWithClaude, identifyBarcodeWithClaude } from './aiService';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

type BarcodeLookupResult = {
  name: string;
  category: string;
  typical_shelf_life_days: number;
  brand?: string | null;
  quantity_text?: string | null;
};

const categoryShelfLifeDefaults: Record<string, number> = {
  produce: 7,
  dairy: 10,
  meat: 4,
  seafood: 2,
  bakery: 5,
  frozen: 90,
  pantry: 180,
  beverage: 30,
  other: 14,
};

function normalizeCategory(input: string): string {
  const normalized = input.trim().toLowerCase();

  if (categoryShelfLifeDefaults[normalized]) {
    return normalized;
  }

  return 'other';
}

function normalizeResult(result: BarcodeLookupResult): BarcodeLookupResult {
  const category = normalizeCategory(result.category);
  const fallback = categoryShelfLifeDefaults[category] ?? 14;
  const shelfLife = Number.isFinite(result.typical_shelf_life_days)
    ? Math.max(1, Math.floor(result.typical_shelf_life_days))
    : fallback;

  return {
    name: result.name.trim(),
    category,
    typical_shelf_life_days: shelfLife,
    brand: result.brand?.trim() || null,
    quantity_text: result.quantity_text?.trim() || null,
  };
}

async function getCachedBarcode(barcode: string): Promise<BarcodeLookupResult | null> {
  const supabase = getSupabaseAdminClient();
  // barcode_cache uses product_name and shelf_life_days. These differ from
  // fridge_items on purpose; naming them wrong here failed silently and meant
  // nothing was ever cached.
  const { data, error } = await supabase
    .from('barcode_cache')
    .select('product_name, category, shelf_life_days, brand, quantity_text')
    .eq('barcode', barcode)
    .single<{
      product_name: string;
      category: string;
      shelf_life_days: number;
      brand: string | null;
      quantity_text: string | null;
    }>();

  if (error || !data) {
    return null;
  }

  return normalizeResult({
    name: data.product_name,
    category: data.category,
    typical_shelf_life_days: data.shelf_life_days,
    brand: data.brand,
    quantity_text: data.quantity_text,
  });
}

async function setCachedBarcode(barcode: string, result: BarcodeLookupResult): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from('barcode_cache').upsert(
    {
      barcode,
      product_name: result.name,
      category: result.category,
      shelf_life_days: result.typical_shelf_life_days,
      brand: result.brand ?? null,
      quantity_text: result.quantity_text ?? null,
    },
    { onConflict: 'barcode' },
  );

  if (error) {
    console.error('barcode cache write failed', { barcode, error });
  }
}

async function identifyWithOpenFoodFacts(barcode: string): Promise<BarcodeLookupResult | null> {
  const baseUrl = process.env.OPEN_FOOD_FACTS_API || 'https://world.openfoodfacts.org/api/v2/product';

  try {
    const response = await axios.get(`${baseUrl}/${encodeURIComponent(barcode)}.json`, {
      timeout: 12000,
    });

    const product = response.data?.product as
      | {
          product_name?: string;
          categories?: string;
          brands?: string;
          quantity?: string;
        }
      | undefined;

    if (!product?.product_name) {
      return null;
    }

    const categoriesText = (product.categories ?? '').toLowerCase();
    const category = categoriesText.includes('dairy')
      ? 'dairy'
      : categoriesText.includes('meat')
        ? 'meat'
        : categoriesText.includes('seafood')
          ? 'seafood'
          : categoriesText.includes('frozen')
            ? 'frozen'
            : categoriesText.includes('bread') || categoriesText.includes('bakery')
              ? 'bakery'
              : categoriesText.includes('beverage') || categoriesText.includes('drink')
                ? 'beverage'
                : categoriesText.includes('fruit') || categoriesText.includes('vegetable')
                  ? 'produce'
                  : 'other';

    // Open Food Facts has no shelf life, so a real product record would
    // otherwise fall back to a flat per-category default - which is how
    // peanut butter ended up at 14 days. Ask Claude instead, and keep the
    // default only if that fails.
    const estimated = await estimateShelfLifeWithClaude({ name: product.product_name, category });

    return normalizeResult({
      name: product.product_name,
      category,
      typical_shelf_life_days: estimated ?? categoryShelfLifeDefaults[category] ?? 14,
      brand: product.brands?.split(',')[0]?.trim() || null,
      quantity_text: product.quantity?.trim() || null,
    });
  } catch {
    return null;
  }
}

export async function identifyBarcode(params: {
  barcode: string;
  barcodeImage?: string;
}): Promise<{ success: true; data: BarcodeLookupResult } | { success: false; status: number; error: string }> {
  const barcode = params.barcode.trim();

  if (!barcode) {
    return {
      success: false,
      status: 400,
      error: 'Barcode is required',
    };
  }

  try {
    const cached = await getCachedBarcode(barcode);

    if (cached) {
      return {
        success: true,
        data: cached,
      };
    }

    // Open Food Facts is real product data keyed on the GTIN; Claude is
    // inference. The image branch used to run first, and the frontend always
    // sends an image, so this lookup was never reached.
    const offResult = await identifyWithOpenFoodFacts(barcode);

    if (offResult) {
      await setCachedBarcode(barcode, offResult);
      return {
        success: true,
        data: offResult,
      };
    }

    if (params.barcodeImage) {
      const claudeResult = normalizeResult(await identifyBarcodeWithClaude({ barcode, barcodeImage: params.barcodeImage }));
      await setCachedBarcode(barcode, claudeResult);
      return {
        success: true,
        data: claudeResult,
      };
    }

    const claudeFallback = normalizeResult(await identifyBarcodeWithClaude({ barcode }));
    await setCachedBarcode(barcode, claudeFallback);

    return {
      success: true,
      data: claudeFallback,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unable to identify barcode',
    };
  }
}
