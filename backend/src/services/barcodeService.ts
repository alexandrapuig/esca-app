import axios from 'axios';

import { identifyBarcodeWithClaude } from './aiService';
import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

type BarcodeLookupResult = {
  name: string;
  category: string;
  typical_shelf_life_days: number;
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
  };
}

async function getCachedBarcode(barcode: string): Promise<BarcodeLookupResult | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('barcode_cache')
    .select('name, category, typical_shelf_life_days')
    .eq('barcode', barcode)
    .single<{ name: string; category: string; typical_shelf_life_days: number }>();

  if (error || !data) {
    return null;
  }

  return normalizeResult(data);
}

async function setCachedBarcode(barcode: string, result: BarcodeLookupResult): Promise<void> {
  const supabase = getSupabaseAdminClient();

  await supabase.from('barcode_cache').upsert(
    {
      barcode,
      name: result.name,
      category: result.category,
      typical_shelf_life_days: result.typical_shelf_life_days,
      last_identified_at: new Date().toISOString(),
    },
    { onConflict: 'barcode' },
  );
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

    return normalizeResult({
      name: product.product_name,
      category,
      typical_shelf_life_days: categoryShelfLifeDefaults[category] ?? 14,
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

    if (params.barcodeImage) {
      const claudeResult = normalizeResult(await identifyBarcodeWithClaude({ barcode, barcodeImage: params.barcodeImage }));
      await setCachedBarcode(barcode, claudeResult);
      return {
        success: true,
        data: claudeResult,
      };
    }

    const offResult = await identifyWithOpenFoodFacts(barcode);

    if (offResult) {
      await setCachedBarcode(barcode, offResult);
      return {
        success: true,
        data: offResult,
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
