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

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUserWithRetry(
  supabase: SupabaseClient,
  userId: string,
  maxAttempts: number = 5,
  delayMs: number = 200
): Promise<{ data: UserRow | null; error: any }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data: userRow, error: userError } = await supabase
      .from('public.users')
      .select('id, email, created_at')
      .eq('id', userId)
      .single<UserRow>();

    // Success - user found
    if (!userError && userRow) {
      return { data: userRow, error: null };
    }

    // Last attempt - return the error
    if (attempt === maxAttempts) {
      return { data: null, error: userError };
    }

    // Not the last attempt - wait and retry
    await sleep(delayMs);
  }

  return { data: null, error: 'Max retries exceeded' };
}

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

  // Fetch user with retry logic to wait for trigger to fire
  const { data: userRow, error: userError } = await fetchUserWithRetry(
    supabase,
    authData.user.id,
    5, // max 5 attempts
    200 // 200ms delay between attempts
  );

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
