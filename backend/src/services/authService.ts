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

  // Provisions the app-level user record. This is the ONLY provisioning path:
  // the on_auth_user_created trigger was dropped on 2026-08-18 because it was
  // aborting signups. Every authenticated request upserts idempotently, so the
  // row is created on the user's first authenticated call after signup.
  const { data: upsertedRow, error: upsertError } = await supabase
    .from('users')
    .upsert(
      {
        auth_user_id: authData.user.id,
        email: normalizedEmail,
      },
      { onConflict: 'auth_user_id' }
    )
    .select('id, created_at')
    .single();

  if (upsertError || !upsertedRow) {
    console.error('unable to provision user record', {
      auth_user_id: authData.user.id,
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
