import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'pescatarian',
  'keto',
  'halal',
  'kosher',
] as const;

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  dietary_restrictions: string[];
  created_at: string;
  terms_accepted_at: string | null;
  terms_version: string | null;
};

export type UserStats = {
  items_consumed_count: number;
  waste_prevented_kg: number;
  co2_saved_kg: number;
  money_saved: number;
  rescue_rate_percent: number | null;
};

/**
 * Average package weight in kg per category, used when an item has no usable
 * quantity of its own. Replaces a flat 0.15 kg for everything, which treated a
 * bag of salad and a litre of milk identically.
 *
 * These are estimates of typical retail package sizes, not measurements.
 */
const CATEGORY_WEIGHTS_KG: Record<string, number> = {
  produce: 0.3,
  dairy: 0.5,
  meat: 0.45,
  seafood: 0.3,
  bakery: 0.35,
  frozen: 0.4,
  pantry: 0.45,
  beverage: 1.0,
  other: 0.3,
};

/** Fallback spend per item when no purchase price was recorded. */
const ESTIMATED_ITEM_PRICE = 2.5;

/** kg CO2e per kg of food waste avoided. Rough figure for mixed food waste. */
const CO2_PER_KG = 2.5;

/**
 * An item's weight in kg, preferring what the user actually recorded.
 *
 * Units are free text, so only the unambiguous mass ones are trusted. Anything
 * else - "pieces", "cans", an empty unit - falls back to the category average,
 * because 2 of something says nothing about its weight.
 */
function itemWeightKg(item: { category: string | null; quantity: number | null; unit: string | null }): number {
  const fallback = CATEGORY_WEIGHTS_KG[item.category ?? 'other'] ?? 0.3;

  if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
    return fallback;
  }

  const unit = (item.unit ?? '').trim().toLowerCase();

  if (unit === 'g' || unit === 'gram' || unit === 'grams') {
    return item.quantity / 1000;
  }

  if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
    return item.quantity;
  }

  // Water-equivalent for liquids. Close enough for milk and juice.
  if (unit === 'ml' || unit === 'millilitre' || unit === 'millilitres') {
    return item.quantity / 1000;
  }

  if (unit === 'l' || unit === 'litre' || unit === 'litres' || unit === 'liter' || unit === 'liters') {
    return item.quantity;
  }

  if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') {
    return (item.quantity * 28.35) / 1000;
  }

  if (unit === 'lb' || unit === 'lbs' || unit === 'pound' || unit === 'pounds') {
    return item.quantity * 0.4536;
  }

  return fallback;
}

type ServiceSuccess<T> = {
  success: true;
  data: T;
};

type ServiceFailure = {
  success: false;
  status: number;
  error: string;
};

type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  dietary_restrictions: string[] | null;
  created_at: string;
  terms_accepted_at: string | null;
  terms_version: string | null;
};

function mapUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    dietary_restrictions: row.dietary_restrictions ?? [],
    created_at: row.created_at,
    terms_accepted_at: row.terms_accepted_at,
    terms_version: row.terms_version,
  };
}

function normalizeDietaryRestrictions(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const allowed: readonly string[] = DIETARY_OPTIONS;

  return input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => allowed.includes(item));
}

export async function getUserProfile(userId: string): Promise<ServiceResult<UserProfile>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, dietary_restrictions, created_at, terms_accepted_at, terms_version')
    .eq('id', userId)
    .single<UserRow>();

  if (error || !data) {
    console.error('getUserProfile failed', { userId, error });
    return { success: false, status: 500, error: 'Unable to fetch profile' };
  }

  return { success: true, data: mapUserProfile(data) };
}

export async function updateUserProfile(
  userId: string,
  updates: { name?: string; dietary_restrictions?: string[] },
): Promise<ServiceResult<UserProfile>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  const patch: { name?: string | null; dietary_restrictions?: string[] } = {};

  if (typeof updates.name === 'string') {
    const trimmed = updates.name.trim();
    patch.name = trimmed.length > 0 ? trimmed : null;
  }

  if (updates.dietary_restrictions !== undefined) {
    patch.dietary_restrictions = normalizeDietaryRestrictions(updates.dietary_restrictions);
  }

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select('id, email, name, dietary_restrictions, created_at, terms_accepted_at, terms_version')
    .single<UserRow>();

  if (error || !data) {
    console.error('updateUserProfile failed', { userId, error });
    return { success: false, status: 500, error: 'Unable to update profile' };
  }

  return { success: true, data: mapUserProfile(data) };
}

export async function acceptTerms(userId: string, version: string): Promise<ServiceResult<UserProfile>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  const { data, error } = await supabase
    .from('users')
    .update({ terms_accepted_at: new Date().toISOString(), terms_version: version })
    .eq('id', userId)
    .select('id, email, name, dietary_restrictions, created_at, terms_accepted_at, terms_version')
    .single<UserRow>();

  if (error || !data) {
    console.error('acceptTerms failed', { userId, error });
    return { success: false, status: 500, error: 'Unable to record terms acceptance' };
  }

  return { success: true, data: mapUserProfile(data) };
}

export async function getUserStats(householdId: string): Promise<ServiceResult<UserStats>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  // Scoped to the household, not the user. This read was missed when everything
  // else moved to household_id: with one member per household the two are the
  // same rows, but once invites ship the dashboard would show only your own
  // items while the inventory showed everyone's.
  const { data, error } = await supabase
    .from('fridge_items')
    .select('status, category, quantity, unit, purchase_price')
    .eq('household_id', householdId)
    .returns<{
      status: string;
      category: string | null;
      quantity: number | null;
      unit: string | null;
      purchase_price: number | null;
    }[]>();

  if (error || !data) {
    console.error('getUserStats failed', { householdId, error });
    return { success: false, status: 500, error: 'Unable to fetch stats' };
  }

  const consumed = data.filter((item) => item.status === 'consumed');
  const expiredCount = data.filter((item) => item.status === 'expired').length;

  const wastePreventedKg = consumed.reduce((total, item) => total + itemWeightKg(item), 0);

  const moneySaved = consumed.reduce((total, item) => {
    const price =
      typeof item.purchase_price === 'number' && Number.isFinite(item.purchase_price) && item.purchase_price >= 0
        ? item.purchase_price
        : ESTIMATED_ITEM_PRICE;

    return total + price;
  }, 0);

  // Fresh items are still undecided, so only settled ones count. Null until
  // something has actually been consumed or expired - 0% would read as failure
  // when it really means "nothing has happened yet".
  const settled = consumed.length + expiredCount;
  const rescueRatePercent = settled > 0 ? Math.round((consumed.length / settled) * 100) : null;

  return {
    success: true,
    data: {
      items_consumed_count: consumed.length,
      waste_prevented_kg: Math.round(wastePreventedKg * 100) / 100,
      co2_saved_kg: Math.round(wastePreventedKg * CO2_PER_KG * 100) / 100,
      money_saved: Math.round(moneySaved * 100) / 100,
      rescue_rate_percent: rescueRatePercent,
    },
  };
}
