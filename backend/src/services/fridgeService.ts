import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

const FRIDGE_ITEM_COLUMNS =
  'id, user_id, name, category, quantity, unit, typical_shelf_life_days, purchase_date, estimated_expiry, status, created_at, brand, purchase_location, purchase_price, notes';

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
};

export type FridgeItem = {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  quantity: number | null;
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
  unit?: string;
  typicalShelfLifeDays?: number;
  brand?: string;
  purchaseLocation?: string;
  purchasePrice?: number;
  notes?: string;
  purchaseDate?: string;
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

  const row = {
    user_id: params.userId,
    household_id: params.householdId,
    name: params.name.trim(),
    category: normalizedCategory,
    quantity: params.quantity ?? null,
    unit: params.unit?.trim() || null,
    typical_shelf_life_days: shelfLifeDays,
    purchase_date: purchaseDate.toISOString().slice(0, 10),
    estimated_expiry: estimatedExpiry.toISOString().slice(0, 10),
    status: 'fresh',
    brand: params.brand?.trim() || null,
    purchase_location: params.purchaseLocation?.trim() || null,
    purchase_price: normalizedPrice,
    notes: params.notes?.trim() || null,
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
