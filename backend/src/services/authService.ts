import { createClient, SupabaseClient } from '@supabase/supabase-js';

type AuthenticatedUser = {
  id: string;
  authUserId: string;
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
  auth_user_id: string;
  email: string;
  created_at: string;
};

let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials are not configured');
  }

  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
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

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .upsert(
      {
        auth_user_id: authData.user.id,
        email: normalizedEmail,
      },
      { onConflict: 'auth_user_id' },
    )
    .select('id, auth_user_id, email, created_at')
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
      authUserId: authData.user.id,
      email: userRow.email,
      createdAt: userRow.created_at,
    },
  };
}