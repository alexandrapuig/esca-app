'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { signUp } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const result = await signUp(email, password);

    if (result.error) {
      setErrorMessage(result.error.message);
      setIsSubmitting(false);
      return;
    }

    if (result.data.session) {
      router.push('/dashboard');
      router.refresh();
      return;
    }

    setSuccessMessage('Check your inbox for the verification link, then come back to finish setup.');
    setIsSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#f7efe0_0%,_#dce7d9_50%,_#f5f0e8_100%)] px-6 py-16 text-stone-900">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_30px_90px_rgba(84,97,61,0.18)] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-stone-200 bg-[#f2eadc] px-8 py-10 lg:border-b-0 lg:border-r lg:px-10">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-700">New account</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-stone-900">Create your Esca workspace.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-700">
            Start with a verified account, then connect your kitchen inventory to spoilage predictions and recipe suggestions.
          </p>
          <div className="mt-8 rounded-[1.5rem] bg-white p-5 shadow-sm">
            <p className="text-sm text-stone-500">What happens next</p>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-stone-700">
              <li>1. Create an account with email and password.</li>
              <li>2. Confirm the verification email from Supabase.</li>
              <li>3. Land in your dashboard with your user profile ready.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center px-6 py-10 sm:px-10">
          <div className="w-full">
            <h2 className="text-3xl font-semibold tracking-tight">Set up your account</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Use a strong password. Esca will redirect verified users to the dashboard automatically.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">Email</span>
                <input
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">Password</span>
                <input
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
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

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {successMessage}
                </div>
              ) : null}

              <button
                className="w-full rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-sm text-stone-600">
              Already registered?{' '}
              <Link className="font-semibold text-stone-900 underline decoration-emerald-400 underline-offset-4" href="/auth/login">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}