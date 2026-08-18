// ============================================================================
// STEP 2A: src/services/authService.ts
// Copy this ENTIRE file and replace your existing authService.ts
// Run this AFTER Step 1 (database migration) completes
// ============================================================================

import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

export type AuthenticatedUser = {
  id: string;
  email: string;
  createdAt: string;
};

type AuthResult =
  | {
      success: true;
      data: AuthenticatedUser;
    }
  | {
      success: false;
      status: number;
      error: string;
    };

export async function authenticateUser(accessToken: string): Promise<AuthResult> {
  if (!accessToken) {
    return {
      success: false,
      status: 400,
      error: 'Access token is required',
    };
  }

  let supabase: ReturnType<typeof getSupabaseAdminClient>;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    return {
      success: false,
      status: 500,
      error: message,
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user?.email) {
    return {
      success: false,
      status: 401,
      error: 'Invalid or expired access token',
    };
  }

  const now = new Date().toISOString();
  const normalizedEmail = authData.user.email.trim().toLowerCase();

  // Idempotently provision the app-level user record.
  // Do not rely solely on DB triggers — they may be absent or fail silently per environment.
  
  // FIX #1: Removed 'updated_at' column which doesn't exist in the users table schema
  // The users table only has: id, auth_user_id, email, dietary_restrictions, cuisine_preferences, created_at
  // No updated_at column exists, so we only upsert the columns that actually exist
  const { data: upsertedRow, error: upsertError } = await supabase
    .from('users')
    .upsert(
      {
        auth_user_id: authData.user.id,
        email: normalizedEmail,
        // REMOVED: updated_at: now (this column doesn't exist)
      },
      { onConflict: 'auth_user_id' }
    )
    .select('id, created_at')
    .single();

  if (upsertError || !upsertedRow) {
    console.error('unable to provision user record', {
      auth_user_id: authData.user.id,
      auth_email: normalizedEmail,
      code: (upsertError as any)?.code,
      message: upsertError?.message,
      details: (upsertError as any)?.details,
      hint: (upsertError as any)?.hint,
      table: 'users',
    });
    return {
      success: false,
      status: 500,
      error: 'Unable to provision user record',
    };
  }

  return {
    success: true,
    data: {
      id: upsertedRow.id,
      email: normalizedEmail,
      createdAt: upsertedRow.created_at ?? now,
    },
  };
}
