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
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16 text-gray-900">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative flex flex-col justify-between bg-[linear-gradient(rgba(6,40,26,0.55),rgba(6,40,26,0.75)),url('https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&h=1600&fit=crop')] bg-cover bg-center px-8 py-10 text-white sm:px-12">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-amber-200">Esca</p>
            <h1 className="mt-6 max-w-md font-serif text-5xl leading-tight">
              Reduce waste with a fridge assistant that actually remembers what you own.
            </h1>
            <p className="mt-6 max-w-lg text-lg font-light leading-relaxed text-gray-100">
              Sign in to track expiring food, see spoilage risk, and keep your kitchen decisions grounded in live inventory.
            </p>
          </div>
        </div>

        <div className="flex items-center px-6 py-10 sm:px-10">
          <div className="w-full">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Welcome back</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight">Sign in to Esca</h2>
            <p className="mt-3 text-base font-light leading-relaxed text-gray-600">
              Use your Supabase email and password. If you just created an account, confirm your email first.
            </p>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Email</span>
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Password</span>
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              {errorMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <button
                className="w-full rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-sm font-light text-gray-600">
              Need an account?{' '}
              <Link className="font-medium text-emerald-900 underline decoration-amber-400 underline-offset-4" href="/auth/signup">
                Create one here
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}