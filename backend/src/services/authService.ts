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
    .select('id, created_at, household_id')
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

  if (!upsertedRow.household_id) {
    const householdError = await ensureHousehold(supabase, upsertedRow.id, normalizedEmail);

    if (householdError) {
      console.error('unable to provision household', {
        user_id: upsertedRow.id,
        error: householdError,
      });
      return {
        success: false,
        status: 500,
        error: 'Unable to provision household',
      };
    }
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

/**
 * Creates a household of one for a user who has none.
 *
 * Only runs when users.household_id is null, so it fires once per user rather
 * than on every authenticated request. Shared households are a paid feature;
 * max_members stays 1 here and is raised at the invite endpoint.
 */
async function ensureHousehold(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  email: string,
): Promise<string | null> {
  const householdName = `${email.split('@')[0]}'s household`;

  const { data: household, error: createError } = await supabase
    .from('households')
    .insert({ name: householdName, max_members: 1 })
    .select('id')
    .single<{ id: string }>();

  if (createError || !household) {
    return createError?.message ?? 'household insert returned no row';
  }

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({ household_id: household.id, user_id: userId, role: 'owner' });

  if (memberError) {
    // 23505 = unique violation on (user_id): a concurrent request for this same
    // new user won the race and already provisioned. Clean up the household we
    // created and treat this as success.
    if ((memberError as { code?: string }).code === '23505') {
      await supabase.from('households').delete().eq('id', household.id);
      return null;
    }

    return memberError.message;
  }

  const { error: linkError } = await supabase
    .from('users')
    .update({ household_id: household.id })
    .eq('id', userId);

  if (linkError) {
    return linkError.message;
  }

  return null;
}
