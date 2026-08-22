import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

type ServiceSuccess<T> = { success: true; data: T };
type ServiceFailure = { success: false; status: number; error: string };
type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export type DeletedAccount = { deleted: true };

/**
 * Permanently deletes a user's account and all associated data.
 *
 * Takes public.users.id (same as every other service) and resolves
 * auth_user_id internally - the two are deliberately distinct.
 *
 * Deletion relies on the FK cascade chain:
 *   auth.users -> public.users -> fridge_items
 *                              -> spoilage_predictions
 *                              -> recipe_suggestions
 *
 * The auth user is removed first so there is no window where the profile
 * row is gone but the auth user survives, which would let
 * authenticateUser() silently recreate an empty profile.
 */
export async function deleteAccount(
  userId: string,
): Promise<ServiceResult<DeletedAccount>> {
  let supabase: SupabaseClient;

  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Supabase is not configured';
    return { success: false, status: 500, error: message };
  }

  const { data: userRow, error: lookupError } = await supabase
    .from('users')
    .select('auth_user_id')
    .eq('id', userId)
    .single<{ auth_user_id: string }>();

  if (lookupError || !userRow) {
    console.error('deleteAccount lookup failed', { userId, error: lookupError });
    return { success: false, status: 404, error: 'Account not found' };
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(
    userRow.auth_user_id,
  );

  if (deleteError) {
    console.error('deleteAccount failed', { userId, error: deleteError });
    return { success: false, status: 500, error: 'Unable to delete account' };
  }

  const { data: remaining, error: verifyError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle<{ id: string }>();

  if (verifyError) {
    console.error('deleteAccount verify failed', { userId, error: verifyError });
    return { success: false, status: 500, error: 'Deletion could not be verified' };
  }

  if (remaining) {
    console.error('deleteAccount cascade did not fire', { userId });
    return {
      success: false,
      status: 500,
      error: 'Account deletion incomplete; please contact support',
    };
  }

  return { success: true, data: { deleted: true } };
}
