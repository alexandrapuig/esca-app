'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { signIn } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    const result = await signIn(email, password);

    if (result.error) {
      setErrorMessage(result.error.message);
      setIsSubmitting(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#fcf1d7,_#f3e4bc_45%,_#efe8dd_100%)] px-6 py-16 text-stone-900">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_30px_90px_rgba(120,98,52,0.18)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-between bg-stone-900 px-8 py-10 text-stone-100 sm:px-12">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Esca</p>
            <h1 className="mt-6 max-w-md text-4xl font-semibold tracking-tight sm:text-5xl">
              Reduce waste with a fridge assistant that actually remembers what you own.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-stone-300">
              Sign in to track expiring food, see spoilage risk, and keep your kitchen decisions grounded in live inventory.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-stone-400">Inventory</p>
              <p className="mt-2 text-2xl font-semibold">Barcode-first</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-stone-400">Predictions</p>
              <p className="mt-2 text-2xl font-semibold">Claude-guided</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-stone-400">Habits</p>
              <p className="mt-2 text-2xl font-semibold">Waste-aware</p>
            </div>
          </div>
        </div>

        <div className="flex items-center px-6 py-10 sm:px-10">
          <div className="w-full">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-stone-500">Welcome back</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Sign in to Esca</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Use your Supabase email and password. If you just created an account, confirm your email first.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">Email</span>
                <input
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-stone-900 focus:bg-white"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">Password</span>
                <input
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-stone-900 focus:bg-white"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <button
                className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-sm text-stone-600">
              Need an account?{' '}
              <Link className="font-semibold text-stone-900 underline decoration-amber-400 underline-offset-4" href="/auth/signup">
                Create one here
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}