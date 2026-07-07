import { Suspense } from 'react';

import CallbackClient from './callback-client';

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5efe4] px-6 py-16 text-stone-900">
      <Suspense
        fallback={
          <section className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-[0_24px_80px_rgba(92,69,33,0.12)]">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-700">Auth callback</p>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">Confirming your account</h1>
            <div className="mx-auto mt-8 h-12 w-12 animate-spin rounded-full border-4 border-stone-200 border-t-amber-600" />
          </section>
        }
      >
        <CallbackClient />
      </Suspense>
    </main>
  );
}