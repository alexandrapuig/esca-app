'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { acceptTerms, getUserProfile } from '@/lib/api';
import { signOut } from '@/lib/supabase';

export default function TermsGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isExemptPath = pathname === '/' || pathname?.startsWith('/legal') || pathname?.startsWith('/auth');

  useEffect(() => {
    if (isExemptPath) {
      setIsLoading(false);
      return;
    }

    let isCurrent = true;

    async function loadProfile() {
      const result = await getUserProfile();

      if (!isCurrent) return;

      if (!result.success) {
        setIsLoading(false);
        return;
      }

      setTermsAccepted(result.data.termsAccepted);
      setIsLoading(false);
    }

    void loadProfile();

    return () => {
      isCurrent = false;
    };
  }, [isExemptPath]);

  async function handleAccept() {
    setIsAccepting(true);
    setErrorMessage('');

    const result = await acceptTerms();

    if (!result.success) {
      setErrorMessage(result.error);
      setIsAccepting(false);
      return;
    }

    setTermsAccepted(true);
    setIsAccepting(false);
  }

  async function handleSignOut() {
    setErrorMessage('');
    const result = await signOut();

    if (result.error) {
      setErrorMessage(result.error.message);
      return;
    }

    router.push('/auth/login');
    router.refresh();
  }

  if (isLoading || isExemptPath || termsAccepted) {
    return null;
  }

  return (
    <div aria-labelledby="terms-gate-title" aria-modal="true" className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-6" role="dialog">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        <h2 className="font-serif text-2xl text-emerald-900" id="terms-gate-title">Our terms have been updated</h2>
        <p className="mt-4 font-light leading-relaxed text-gray-600">
          To continue using Esca, please accept our{' '}
          <Link className="text-emerald-900 underline decoration-emerald-400 underline-offset-4" href="/legal/terms" rel="noopener noreferrer" target="_blank">Terms of Service</Link>{' '}
          and{' '}
          <Link className="text-emerald-900 underline decoration-emerald-400 underline-offset-4" href="/legal/privacy" rel="noopener noreferrer" target="_blank">Privacy Policy</Link>.
        </p>

        {errorMessage ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

        <button
          className="mt-6 w-full rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isAccepting}
          onClick={handleAccept}
          type="button"
        >
          {isAccepting ? 'Saving...' : 'I accept'}
        </button>
        <button className="mt-4 text-sm font-light text-gray-600 underline underline-offset-4 transition hover:text-emerald-900" onClick={handleSignOut} type="button">
          Sign out instead
        </button>
      </div>
    </div>
  );
}