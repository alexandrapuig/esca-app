import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

const FRIDGE_ITEM_COLUMNS =
  'id, user_id, name, category, quantity, unit, size, size_unit, typical_shelf_life_days, purchase_date, estimated_expiry, status, created_at, brand, purchase_location, purchase_price, notes, barcode';

/**
 * The fixed size_unit list. Volume and mass are kept separate on purpose:
 * 'fl oz' is not 'oz'.
 */
export const SIZE_UNITS = ['g', 'kg', 'ml', 'l', 'oz', 'lb', 'fl oz', 'other'] as const;

/** Free-text spellings accepted from older clients, mapped to the fixed list. */
const SIZE_UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  'fl oz': 'fl oz', 'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz',
};

/**
 * Counting words that older clients sent as a unit. These are quantities,
 * not sizes: "3 bananas" is quantity 3 with an unknown size.
 */
const COUNTING_WORDS = new Set([
  'banana', 'bananas', 'piece', 'pieces', 'item', 'items',
  'can', 'cans', 'carton', 'cartons', 'bunch', 'bunches',
  'pack', 'packs', 'bag', 'bags', 'box', 'boxes',
]);

export function normalizeSizeUnit(value?: string | null): string | null {
  const raw = (value ?? '').trim().toLowerCase();

  if (!raw) {
    return null;
  }

  return SIZE_UNIT_ALIASES[raw] ?? 'other';
}

/**
 * Maps a legacy quantity/unit pair onto quantity/size/size_unit.
 *
 * Older clients send one number and a free-text unit, which conflates "how
 * many" with "how much in each". A measure means one package of that size;
 * a counting word means that many packages of unknown size.
 */
export function mapLegacyQuantityUnit(
  quantity: number | null | undefined,
  unit: string | null | undefined,
): { quantity: number | null; size: number | null; size_unit: string | null } {
  const raw = (unit ?? '').trim().toLowerCase();
  const amount = typeof quantity === 'number' && Number.isFinite(quantity) ? quantity : null;

  if (!raw) {
    return { quantity: amount, size: null, size_unit: null };
  }

  if (COUNTING_WORDS.has(raw)) {
    return { quantity: amount, size: null, size_unit: null };
  }

  return { quantity: 1, size: amount, size_unit: normalizeSizeUnit(raw) };
}

type FridgeStatus = 'fresh' | 'consumed' | 'expired';
type FridgeCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'bakery'
  | 'frozen'
  | 'pantry'
  | 'beverage'
  | 'other';

type FridgeItemRow = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  quantity: number | null;
  size: number | null;
  size_unit: string | null;
  /** @deprecated Still written for older clients. Nothing reads it. */
  unit: string | null;
  typical_shelf_life_days: number | null;
  purchase_date: string;
  estimated_expiry: string | null;
  status: string;
  created_at: string;
  brand: string | null;
  purchase_location: string | null;
  purchase_price: number | null;
  notes: string | null;
  barcode: string | null;
};

export type FridgeItem = {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  quantity: number | null;
  size: number | null;
  sizeUnit: string | null;
  /** @deprecated Still returned for older clients. */
  unit: string | null;
  typicalShelfLifeDays: number | null;
  purchaseDate: string;
  estimatedExpiry: string | null;
  status: FridgeStatus;
  createdAt: string;
  brand: string | null;
  purchaseLocation: string | null;
  purchasePrice: number | null;
  notes: string | null;
  barcode: string | null;
};

type ServiceSuccess<T> = {
  success: true;
  data: T;
};

type ServiceFailure = {
  success: false;
  status: number;
  error: string;
  debug?: Record<string, unknown>;
};

type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

function mapFridgeItem(row: FridgeItemRow): FridgeItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    size: row.size,
    sizeUnit: row.size_unit,
    unit: row.unit,
    typicalShelfLifeDays: row.typical_shelf_life_days,
    purchaseDate: row.purchase_date,
    estimatedExpiry: row.estimated_expiry,
    status: (row.status as FridgeStatus) ?? 'fresh',
    createdAt: row.created_at,
    brand: row.brand,
    purchaseLocation: row.purchase_location,
    purchasePrice: row.purchase_price,
    notes: row.notes,
    barcode: row.barcode,
  };
}

function normalizeCategory(category?: string): FridgeCategory {
  const normalized = (category ?? 'other').trim().toLowerCase();

  if (
    normalized === 'produce' ||
    normalized === 'dairy' ||
    normalized === 'meat' ||
    normalized === 'seafood' ||
    normalized === 'bakery' ||
    normalized === 'frozen' ||
    normalized === 'pantry' ||
    normalized === 'beverage'
  ) {
    return normalized;
  }

  return 'other';
}

function estimateExpiryDate(category: FridgeCategory, purchaseDate: Date): Date {
  const daysByCategory: Record<FridgeCategory, number> = {
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

  const estimate = new Date(purchaseDate);
  estimate.setDate(estimate.getDate() + daysByCategory[category]);
  return estimate;
}

export async function createFridgeItem(params: {
  userId: string;
  householdId: string;
  name: string;
  category?: string;
  quantity?: number;
  size?: number;
  sizeUnit?: string;
  /** @deprecated Older clients send a single quantity plus a free-text unit. */
  unit?: string;
  typicalShelfLifeDays?: number;
  brand?: string;
  purchaseLocation?: string;
  purchasePrice?: number;
  notes?: string;
  purchaseDate?: string;
  barcode?: string;
  estimatedExpiry?: string;
}): Promise<ServiceResult<FridgeItem>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  const parsedPurchaseDate =
    params.purchaseDate && /^\d{4}-\d{2}-\d{2}$/.test(params.purchaseDate)
      ? new Date(params.purchaseDate + 'T00:00:00Z')
      : null;
  const purchaseDate =
    parsedPurchaseDate && !Number.isNaN(parsedPurchaseDate.getTime())
      ? parsedPurchaseDate
      : new Date();
  const normalizedCategory = normalizeCategory(params.category);
  const shelfLifeDays =
    typeof params.typicalShelfLifeDays === 'number' && Number.isFinite(params.typicalShelfLifeDays)
      ? Math.max(1, Math.floor(params.typicalShelfLifeDays))
      : null;
  const estimatedExpiry = shelfLifeDays
    ? new Date(purchaseDate.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000)
    : estimateExpiryDate(normalizedCategory, purchaseDate);

  const normalizedPrice =
    typeof params.purchasePrice === 'number' &&
    Number.isFinite(params.purchasePrice) &&
    params.purchasePrice >= 0
      ? Math.round(params.purchasePrice * 100) / 100
      : null;

  // New fields win when present; the legacy pair is only used on its own.
  const sizing =
    params.size !== undefined || params.sizeUnit !== undefined
      ? {
          quantity: params.quantity ?? 1,
          size: typeof params.size === 'number' && Number.isFinite(params.size) ? params.size : null,
          size_unit: normalizeSizeUnit(params.sizeUnit),
        }
      : mapLegacyQuantityUnit(params.quantity, params.unit);

  const row = {
    user_id: params.userId,
    household_id: params.householdId,
    name: params.name.trim(),
    category: normalizedCategory,
    quantity: sizing.quantity,
    size: sizing.size,
    size_unit: sizing.size_unit,
    // Written for older clients still reading it. Nothing here reads it back.
    unit: params.unit?.trim() || null,
    typical_shelf_life_days: shelfLifeDays,
    purchase_date: purchaseDate.toISOString().slice(0, 10),
    // The add form computes and shows an expiry before saving, and the user
    // can override it. Prefer what they actually saw over recomputing.
    estimated_expiry:
      params.estimatedExpiry && /^\d{4}-\d{2}-\d{2}$/.test(params.estimatedExpiry)
        ? params.estimatedExpiry
        : estimatedExpiry.toISOString().slice(0, 10),
    status: 'fresh',
    brand: params.brand?.trim() || null,
    purchase_location: params.purchaseLocation?.trim() || null,
    purchase_price: normalizedPrice,
    notes: params.notes?.trim() || null,
    barcode: params.barcode?.trim() || null,
  };

  const { data, error } = await supabase
    .from('fridge_items')
    .insert(row)
    .select(
      FRIDGE_ITEM_COLUMNS,
    )
    .single<FridgeItemRow>();

  if (error || !data) {
    console.error('createFridgeItem failed', { userId: params.userId, row, error });
    return {
      success: false,
      status: 500,
      error: 'Unable to create fridge item',
    };
  }

  return {
    success: true,
    data: mapFridgeItem(data),
  };
}

export async function listFridgeItems(params: {
  householdId: string;
  status?: string;
}): Promise<ServiceResult<FridgeItem[]>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  let query = supabase
    .from('fridge_items')
    .select(
      FRIDGE_ITEM_COLUMNS,
    )
    .eq('household_id', params.householdId)
    .order('purchase_date', { ascending: false });

  if (params.status === 'fresh' || params.status === 'consumed' || params.status === 'expired') {
    query = query.eq('status', params.status);
  }

  const { data, error } = await query.returns<FridgeItemRow[]>();

  if (error || !data) {
    return {
      success: false,
      status: 500,
      error: 'Unable to fetch fridge items',
    };
  }

  return {
    success: true,
    data: data.map(mapFridgeItem),
  };
}

export async function updateFridgeItemStatus(params: {
  householdId: string;
  itemId: string;
  status: FridgeStatus;
}): Promise<ServiceResult<FridgeItem>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  const { data, error } = await supabase
    .from('fridge_items')
    .update({ status: params.status })
    .eq('id', params.itemId)
    .eq('household_id', params.householdId)
    .select(
      FRIDGE_ITEM_COLUMNS,
    )
    .single<FridgeItemRow>();

  if (error) {
    return {
      success: false,
      status: 500,
      error: 'Unable to update fridge item',
    };
  }

  if (!data) {
    return {
      success: false,
      status: 404,
      error: 'Fridge item not found',
    };
  }

  return {
    success: true,
    data: mapFridgeItem(data),
  };
}

export async function updateFridgeItem(params: {
  householdId: string;
  itemId: string;
  name?: string;
  category?: string;
  quantity?: number | null;
  size?: number | null;
  sizeUnit?: string | null;
  /** @deprecated Older clients send a single quantity plus a free-text unit. */
  unit?: string | null;
  typicalShelfLifeDays?: number | null;
  estimatedExpiry?: string | null;
  purchaseDate?: string;
  status?: FridgeStatus;
  brand?: string | null;
  purchaseLocation?: string | null;
  purchasePrice?: number | null;
  notes?: string | null;
}): Promise<ServiceResult<FridgeItem>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  // Only fields actually present are written, so an omitted field is left
  // alone. An explicit null clears an optional column. user_id and
  // household_id are never editable.
  const updates: Record<string, unknown> = {};

  if (typeof params.name === 'string' && params.name.trim()) {
    updates.name = params.name.trim();
  }

  if (typeof params.category === 'string') {
    updates.category = normalizeCategory(params.category);
  }

  const sendsNewSizing = params.size !== undefined || params.sizeUnit !== undefined;

  if (params.quantity !== undefined) {
    updates.quantity = params.quantity;
  }

  if (params.size !== undefined) {
    updates.size =
      typeof params.size === 'number' && Number.isFinite(params.size) ? params.size : null;
  }

  if (params.sizeUnit !== undefined) {
    updates.size_unit = normalizeSizeUnit(params.sizeUnit);
  }

  if (params.unit !== undefined) {
    // Still stored so older clients keep seeing something sensible.
    updates.unit = params.unit?.trim() || null;

    // A legacy client sending only quantity + unit means the pair together:
    // "12 ounces" is one package of 12 oz, not twelve of something.
    if (!sendsNewSizing) {
      const sizing = mapLegacyQuantityUnit(params.quantity, params.unit);
      updates.quantity = sizing.quantity;
      updates.size = sizing.size;
      updates.size_unit = sizing.size_unit;
    }
  }

  if (params.typicalShelfLifeDays !== undefined) {
    updates.typical_shelf_life_days =
      typeof params.typicalShelfLifeDays === 'number' && Number.isFinite(params.typicalShelfLifeDays)
        ? Math.max(1, Math.floor(params.typicalShelfLifeDays))
        : null;
  }

  if (params.estimatedExpiry !== undefined) {
    updates.estimated_expiry = params.estimatedExpiry || null;
  }

  if (typeof params.purchaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.purchaseDate)) {
    updates.purchase_date = params.purchaseDate;
  }

  if (params.status) {
    updates.status = params.status;
  }

  if (params.brand !== undefined) {
    updates.brand = params.brand?.trim() || null;
  }

  if (params.purchaseLocation !== undefined) {
    updates.purchase_location = params.purchaseLocation?.trim() || null;
  }

  if (params.purchasePrice !== undefined) {
    updates.purchase_price =
      typeof params.purchasePrice === 'number' &&
      Number.isFinite(params.purchasePrice) &&
      params.purchasePrice >= 0
        ? Math.round(params.purchasePrice * 100) / 100
        : null;
  }

  if (params.notes !== undefined) {
    updates.notes = params.notes?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      status: 400,
      error: 'No valid fields to update',
    };
  }

  const { data, error } = await supabase
    .from('fridge_items')
    .update(updates)
    .eq('id', params.itemId)
    .eq('household_id', params.householdId)
    .select(
      FRIDGE_ITEM_COLUMNS,
    )
    .single<FridgeItemRow>();

  if (error) {
    console.error('updateFridgeItem failed', { itemId: params.itemId, updates, error });
    return {
      success: false,
      status: 500,
      error: 'Unable to update fridge item',
    };
  }

  if (!data) {
    return {
      success: false,
      status: 404,
      error: 'Fridge item not found',
    };
  }

  return {
    success: true,
    data: mapFridgeItem(data),
  };
}

export async function deleteFridgeItem(params: {
  householdId: string;
  itemId: string;
}): Promise<ServiceResult<null>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  const { data, error } = await supabase
    .from('fridge_items')
    .delete()
    .eq('id', params.itemId)
    .eq('household_id', params.householdId)
    .select('id')
    .single<{ id: string }>();

  if (error) {
    return {
      success: false,
      status: 500,
      error: 'Unable to delete fridge item',
    };
  }

  if (!data) {
    return {
      success: false,
      status: 404,
      error: 'Fridge item not found',
    };
  }

  return {
    success: true,
    data: null,
  };
}
