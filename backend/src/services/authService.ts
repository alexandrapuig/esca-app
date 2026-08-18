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
  console.log('[authService] authenticateUser called');
  console.log('[authService] Token present:', !!accessToken);

  if (!accessToken) {
    console.log('[authService] ERROR: No access token provided');
    return {
      success: false,
      status: 400,
      error: 'Access token is required',
    };
  }

  let supabase: ReturnType<typeof getSupabaseAdminClient>;
  try {
    console.log('[authService] Getting Supabase admin client...');
    supabase = getSupabaseAdminClient();
    console.log('[authService] Supabase admin client obtained');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase is not configured';
    console.error('[authService] ERROR getting Supabase client:', message);
    return {
      success: false,
      status: 500,
      error: message,
    };
  }

  console.log('[authService] Calling supabase.auth.getUser...');
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  
  console.log('[authService] Auth response received');
  console.log('[authService] Auth error:', authError?.message || 'none');
  console.log('[authService] Auth user ID:', authData.user?.id || 'missing');
  console.log('[authService] Auth user email:', authData.user?.email || 'missing');

  if (authError || !authData.user?.email) {
    console.error('[authService] ERROR: Invalid token or missing email');
    return {
      success: false,
      status: 401,
      error: 'Invalid or expired access token',
    };
  }

  const now = new Date().toISOString();
  const normalizedEmail = authData.user.email.trim().toLowerCase();

  console.log('[authService] Normalized email:', normalizedEmail);
  console.log('[authService] Attempting to upsert user...');

  // Idempotently provision the app-level user record.
  // Do not rely solely on DB triggers — they may be absent or fail silently per environment.
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

  console.log('[authService] Upsert response received');
  console.log('[authService] Upsert error:', upsertError?.message || 'none');
  console.log('[authService] Upserted row ID:', upsertedRow?.id || 'missing');

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

  console.log('[authService] User provisioning successful');
  console.log('[authService] User ID:', upsertedRow.id);

  return {
    success: true,
    data: {
      id: upsertedRow.id,
      email: normalizedEmail,
      createdAt: upsertedRow.created_at ?? now,
    },
  };
}
