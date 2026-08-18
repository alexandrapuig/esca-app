// ============================================================================
// STEP 3: lib/supabase.ts (Frontend)
// Copy this ENTIRE file and replace your existing lib/supabase.ts
// Run this AFTER Step 2 (backend code) is deployed and running
// ============================================================================

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

// ============================================================================
// FIX #3: Removed ensureUserProfile() function
// ============================================================================
// WHY IT WAS REMOVED:
// 1. The function used wrong column names: 'id' instead of 'auth_user_id'
// 2. The function used wrong onConflict key: 'id' instead of 'auth_user_id'
// 3. It duplicated backend logic - the backend authService.ts already handles 
//    user provisioning correctly when /auth/login or /auth/session is called
// 4. Frontend browser clients cannot write to users table due to Row Level 
//    Security (RLS) policies - only the backend admin client can
// 5. The function was called after signUp/signIn, adding latency and potential 
//    failure points
//
// SOLUTION: The backend now handles ALL user provisioning via authService.ts
// The frontend just gets the session and passes the token to the backend API
// ============================================================================

export async function signUp(email: string, password: string): Promise<AuthResponse> {
  const supabase = getSupabaseClient();
  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  // REMOVED: await ensureUserProfile(result.data.user);
  // User provisioning is now handled entirely by backend authService.ts

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

  // REMOVED: await ensureUserProfile(result.data.user);
  // User provisioning is now handled entirely by backend authService.ts

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
