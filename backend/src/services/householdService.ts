import { randomBytes } from 'crypto';

import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; status: number; error: string };

/** How long a "join my household" link stays usable. */
const INVITE_TTL_DAYS = 7;

export type HouseholdMember = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  joinedAt: string | null;
};

export type HouseholdInvite = {
  id: string;
  token: string;
  expiresAt: string;
  createdAt: string | null;
};

export type HouseholdSummary = {
  householdId: string;
  name: string | null;
  maxMembers: number;
  members: HouseholdMember[];
  pendingInvites: HouseholdInvite[];
  isOwner: boolean;
};

/**
 * Everything the profile page shows: who is in the household, what invites are
 * outstanding, and whether this user may manage them.
 */
export async function getHouseholdSummary(params: {
  userId: string;
  householdId: string;
}): Promise<ServiceResult<HouseholdSummary>> {
  const supabase = getSupabaseAdminClient();

  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('id, name, max_members')
    .eq('id', params.householdId)
    .single<{ id: string; name: string | null; max_members: number }>();

  if (householdError || !household) {
    return { success: false, status: 404, error: 'Household not found' };
  }

  const { data: memberRows, error: memberError } = await supabase
    .from('household_members')
    .select('user_id, role, joined_at, users!inner(id, email, name)')
    .eq('household_id', params.householdId)
    .order('joined_at', { ascending: true });

  if (memberError) {
    return { success: false, status: 500, error: 'Unable to load household members' };
  }

  const members: HouseholdMember[] = (memberRows ?? []).map((row) => {
    const joined = row.users as
      | { id: string; email: string; name: string | null }
      | Array<{ id: string; email: string; name: string | null }>
      | null;

    const user = Array.isArray(joined) ? joined[0] : joined;

    return {
      userId: row.user_id as string,
      email: user?.email ?? '',
      name: user?.name ?? null,
      role: (row.role as string) ?? 'member',
      joinedAt: (row.joined_at as string) ?? null,
    };
  });

  const isOwner = members.some((member) => member.userId === params.userId && member.role === 'owner');

  // Only an owner sees outstanding invite links, since the token is the
  // credential: anyone holding it can join.
  let pendingInvites: HouseholdInvite[] = [];

  if (isOwner) {
    const { data: inviteRows } = await supabase
      .from('household_invites')
      .select('id, token, expires_at, created_at')
      .eq('household_id', params.householdId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .returns<{ id: string; token: string; expires_at: string; created_at: string | null }[]>();

    pendingInvites = (inviteRows ?? []).map((row) => ({
      id: row.id,
      token: row.token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));
  }

  return {
    success: true,
    data: {
      householdId: household.id,
      name: household.name,
      maxMembers: household.max_members,
      members,
      pendingInvites,
      isOwner,
    },
  };
}

/**
 * Mints a single-use invite token.
 *
 * max_members is the paywall: it defaults to 1, so this refuses until the
 * household has been raised to allow more than its current membership.
 */
export async function createHouseholdInvite(params: {
  userId: string;
  householdId: string;
}): Promise<ServiceResult<HouseholdInvite>> {
  const supabase = getSupabaseAdminClient();

  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', params.householdId)
    .eq('user_id', params.userId)
    .single<{ role: string }>();

  if (membership?.role !== 'owner') {
    return { success: false, status: 403, error: 'Only the household owner can invite' };
  }

  const { data: household } = await supabase
    .from('households')
    .select('max_members')
    .eq('id', params.householdId)
    .single<{ max_members: number }>();

  const { count } = await supabase
    .from('household_members')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', params.householdId);

  const maxMembers = household?.max_members ?? 1;
  const memberCount = count ?? 1;

  if (memberCount >= maxMembers) {
    return {
      success: false,
      status: 402,
      error: 'Shared households are not available on your plan yet.',
    };
  }

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('household_invites')
    .insert({
      household_id: params.householdId,
      invited_by: params.userId,
      token,
      expires_at: expiresAt,
    })
    .select('id, token, expires_at, created_at')
    .single<{ id: string; token: string; expires_at: string; created_at: string | null }>();

  if (error || !data) {
    return { success: false, status: 500, error: 'Unable to create invite' };
  }

  return {
    success: true,
    data: { id: data.id, token: data.token, expiresAt: data.expires_at, createdAt: data.created_at },
  };
}

export async function revokeHouseholdInvite(params: {
  userId: string;
  householdId: string;
  inviteId: string;
}): Promise<ServiceResult<{ revoked: true }>> {
  const supabase = getSupabaseAdminClient();

  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', params.householdId)
    .eq('user_id', params.userId)
    .single<{ role: string }>();

  if (membership?.role !== 'owner') {
    return { success: false, status: 403, error: 'Only the household owner can revoke invites' };
  }

  const { error } = await supabase
    .from('household_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', params.inviteId)
    .eq('household_id', params.householdId)
    .is('accepted_at', null);

  if (error) {
    return { success: false, status: 500, error: 'Unable to revoke invite' };
  }

  return { success: true, data: { revoked: true } };
}

/** Error codes raised by the accept_household_invite Postgres function. */
const ACCEPT_ERRORS: Record<string, { status: number; message: string }> = {
  invite_not_found: { status: 404, message: 'That invite link is not valid.' },
  invite_already_used: { status: 410, message: 'That invite link has already been used.' },
  invite_revoked: { status: 410, message: 'That invite link was cancelled.' },
  invite_expired: { status: 410, message: 'That invite link has expired.' },
  already_a_member: { status: 400, message: 'You are already in this household.' },
  household_full: { status: 402, message: 'That household is full.' },
  user_has_no_household: { status: 500, message: 'Your account is not set up correctly.' },
};

/**
 * Accepting moves the joiner's items into the new household and deletes the
 * one they came from. It runs as a single Postgres function so a half-applied
 * move cannot split someone's data across two households.
 */
export async function acceptHouseholdInvite(params: {
  userId: string;
  token: string;
}): Promise<ServiceResult<{ householdId: string }>> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc('accept_household_invite', {
    p_token: params.token,
    p_user_id: params.userId,
  });

  if (error) {
    const matched = Object.entries(ACCEPT_ERRORS).find(([code]) => error.message.includes(code));

    if (matched) {
      const [, mapped] = matched;
      return { success: false, status: mapped.status, error: mapped.message };
    }

    console.error('acceptHouseholdInvite failed', { userId: params.userId, error });
    return { success: false, status: 500, error: 'Unable to join that household' };
  }

  return { success: true, data: { householdId: data as string } };
}
