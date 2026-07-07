'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ensureUserProfile, getSupabaseClient } from '@/lib/supabase';

export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('Verifying your email and creating your session...');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function finishAuth() {
      const authCode = searchParams.get('code');
      const authError = searchParams.get('error_description') ?? searchParams.get('error');

      if (authError) {
        setErrorMessage(authError);
        setStatusMessage('We could not verify your account.');
        return;
      }

      if (!authCode) {
        setErrorMessage('Missing verification code. Request a new confirmation email and try again.');
        setStatusMessage('We could not verify your account.');
        return;
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

      if (error) {
        setErrorMessage(error.message);
        setStatusMessage('We could not verify your account.');
        return;
      }

      await ensureUserProfile(data.user);
      router.replace('/dashboard');
      router.refresh();
    }

    void finishAuth();
  }, [router, searchParams]);

  return (
    <section className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-[0_24px_80px_rgba(92,69,33,0.12)]">
      <p className="text-sm uppercase tracking-[0.35em] text-amber-700">Auth callback</p>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Confirming your account</h1>
      <p className="mt-4 text-base leading-7 text-stone-600">{statusMessage}</p>

      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-left text-sm leading-6 text-red-700">
          {errorMessage}
        </div>
      ) : (
        <div className="mx-auto mt-8 h-12 w-12 animate-spin rounded-full border-4 border-stone-200 border-t-amber-600" />
      )}

      {errorMessage ? (
        <Link
          className="mt-8 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
          href="/auth/login"
        >
          Return to sign in
        </Link>
      ) : null}
    </section>
  );
}