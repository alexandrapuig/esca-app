import type { SupabaseClient } from '@supabase/supabase-js';
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

type UserRow = {
  id: string;
  email: string;
  created_at: string;
};

export async function authenticateUser(accessToken: string): Promise<AuthResult> {
  if (!accessToken) {
    return {
      success: false,
      status: 400,
      error: 'Access token is required',
    };
  }

  let supabase: SupabaseClient;
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

  const normalizedEmail = authData.user.email.trim().toLowerCase();

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .upsert(
      {
        id: authData.user.id,
        email: normalizedEmail,
      },
      { onConflict: 'id' },
    )
    .select('id, email, created_at')
    .single<UserRow>();

  if (userError || !userRow) {
    return {
      success: false,
      status: 500,
      error: 'Unable to provision user record',
    };
  }

  return {
    success: true,
    data: {
      id: userRow.id,
      email: userRow.email,
      createdAt: userRow.created_at,
    },
  };
}
