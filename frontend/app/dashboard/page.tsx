'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ensureUserProfile, getCurrentUser, getSupabaseClient, signOut } from '@/lib/supabase';

type UserProfile = {
  id: string;
  email: string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [authUserId, setAuthUserId] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const user = await getCurrentUser();

      if (!user?.email) {
        router.replace('/auth/login');
        return;
      }

      setUserEmail(user.email);
      setAuthUserId(user.id);
      await ensureUserProfile(user);

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, email, created_at')
        .eq('auth_user_id', user.id)
        .single<UserProfile>();

      if (error) {
        setErrorMessage(error.message);
      } else {
        setProfile(data);
      }

      setIsLoading(false);
    }

    void loadDashboard();
  }, [router]);

  async function handleSignOut() {
    setIsSigningOut(true);
    const result = await signOut();

    if (result.error) {
      setErrorMessage(result.error.message);
      setIsSigningOut(false);
      return;
    }

    router.push('/auth/login');
    router.refresh();
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f1e8] px-6 py-16 text-stone-900">
        <section className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-10 shadow-[0_24px_80px_rgba(92,69,33,0.12)]">
          <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-6 h-10 w-3/4 animate-pulse rounded-full bg-stone-100" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-stone-100" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-stone-100" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f0e5d0_0%,_#f7f2ea_42%,_#ffffff_100%)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-6 rounded-[2rem] bg-stone-900 px-8 py-8 text-stone-100 shadow-[0_24px_80px_rgba(38,29,18,0.18)] sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Dashboard</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Welcome to your Esca workspace</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
              Your account is active. This is the protected area where inventory, spoilage predictions, and waste-reduction metrics will live.
            </p>
          </div>

          <button
            className="inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out...' : 'Log out'}
          </button>
        </header>

        {errorMessage ? (
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(69,48,17,0.08)]">
            <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Account details</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] bg-stone-100 p-5">
                <p className="text-sm text-stone-500">Email</p>
                <p className="mt-3 break-all text-lg font-semibold text-stone-900">{userEmail}</p>
              </div>
              <div className="rounded-[1.5rem] bg-stone-100 p-5">
                <p className="text-sm text-stone-500">Auth user ID</p>
                <p className="mt-3 break-all text-sm font-medium text-stone-900">{authUserId}</p>
              </div>
              <div className="rounded-[1.5rem] bg-stone-100 p-5">
                <p className="text-sm text-stone-500">Profile row ID</p>
                <p className="mt-3 break-all text-sm font-medium text-stone-900">{profile?.id ?? 'Not loaded'}</p>
              </div>
              <div className="rounded-[1.5rem] bg-stone-100 p-5">
                <p className="text-sm text-stone-500">Created</p>
                <p className="mt-3 text-sm font-medium text-stone-900">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleString() : 'Not loaded'}
                </p>
              </div>
            </div>
          </article>

          <aside className="rounded-[2rem] border border-stone-200 bg-[#f6efe1] p-8 shadow-[0_12px_40px_rgba(69,48,17,0.08)]">
            <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Next moves</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">Auth is in place. Build on top of it.</h2>
            <ul className="mt-6 space-y-4 text-sm leading-6 text-stone-700">
              <li>Add fridge inventory pages scoped to the authenticated user.</li>
              <li>Connect spoilage predictions to rows owned by this account.</li>
              <li>Extend the dashboard with recipes and waste metrics.</li>
            </ul>

            <Link
              className="mt-8 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
              href="/"
            >
              Back to landing page
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}