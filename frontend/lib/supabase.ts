'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { AuthError, Session, SupabaseClient, User } from '@supabase/supabase-js';

type AuthResponse = {
  data: {
    session: Session | null;
    user: User | null;
  };
  error: AuthError | null;
};

let browserClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }

  return supabaseUrl;
}

function getSupabaseAnonKey(): string {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured');
  }

  return supabaseAnonKey;
}

function getSiteUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

export function getSupabaseClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());

  return browserClient;
}

export async function ensureUserProfile(user: User | null): Promise<void> {
  if (!user?.email) {
    return;
  }

  const supabase = getSupabaseClient();

  await supabase.from('users').upsert(
    {
      auth_user_id: user.id,
      email: user.email.trim().toLowerCase(),
    },
    { onConflict: 'auth_user_id' },
  );
}

export async function signUp(email: string, password: string): Promise<AuthResponse> {
  const supabase = getSupabaseClient();

  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (!result.error) {
    await ensureUserProfile(result.data.user);
  }

  return {
    data: {
      session: result.data.session,
      user: result.data.user,
    },
    error: result.error,
  };
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const supabase = getSupabaseClient();

  const result = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!result.error) {
    await ensureUserProfile(result.data.user);
  }

  return {
    data: {
      session: result.data.session,
      user: result.data.user,
    },
    error: result.error,
  };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const supabase = getSupabaseClient();

  return supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}