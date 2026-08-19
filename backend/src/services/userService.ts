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
};

export type UserStats = {
  items_consumed_count: number;
  waste_prevented_kg: number;
  co2_saved_kg: number;
  money_saved: number;
};

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
};

function mapUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    dietary_restrictions: row.dietary_restrictions ?? [],
    created_at: row.created_at,
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
    .select('id, email, name, dietary_restrictions, created_at')
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
    .select('id, email, name, dietary_restrictions, created_at')
    .single<UserRow>();

  if (error || !data) {
    console.error('updateUserProfile failed', { userId, error });
    return { success: false, status: 500, error: 'Unable to update profile' };
  }

  return { success: true, data: mapUserProfile(data) };
}

export async function getUserStats(userId: string): Promise<ServiceResult<UserStats>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  const { data, error } = await supabase
    .from('fridge_items')
    .select('status')
    .eq('user_id', userId)
    .returns<{ status: string }[]>();

  if (error || !data) {
    console.error('getUserStats failed', { userId, error });
    return { success: false, status: 500, error: 'Unable to fetch stats' };
  }

  const itemsConsumedCount = data.filter((item) => item.status === 'consumed').length;

  // Rough per-item estimates until real cost/weight tracking exists.
  const wastePreventedKg = Math.round(itemsConsumedCount * 0.15 * 100) / 100;
  const co2SavedKg = Math.round(wastePreventedKg * 2.5 * 100) / 100;
  const moneySaved = Math.round(itemsConsumedCount * 2.5 * 100) / 100;

  return {
    success: true,
    data: {
      items_consumed_count: itemsConsumedCount,
      waste_prevented_kg: wastePreventedKg,
      co2_saved_kg: co2SavedKg,
      money_saved: moneySaved,
    },
  };
}
