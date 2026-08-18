'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('Verifying your email and creating your session...');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function finishAuth() {
      try {
        const supabase = getSupabaseClient();

        // Let Supabase automatically handle the hash and create session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setErrorMessage(error.message);
          setStatusMessage('We could not verify your account.');
          return;
        }

        if (!session) {
          setErrorMessage('No session found. Please try logging in again.');
          setStatusMessage('We could not verify your account.');
          return;
        }

        // Session is now created, just redirect to dashboard
        router.replace('/dashboard');
        router.refresh();
      } catch (err) {
        const error = err instanceof Error ? err.message : 'An unknown error occurred';
        setErrorMessage(error);
        setStatusMessage('We could not verify your account.');
      }
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
