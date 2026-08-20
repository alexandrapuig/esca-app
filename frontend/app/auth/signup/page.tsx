'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { signUp } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasAcceptedLegalTerms, setHasAcceptedLegalTerms] = useState(false);
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
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16 text-gray-900">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative border-b border-gray-200 bg-[linear-gradient(rgba(6,40,26,0.55),rgba(6,40,26,0.75)),url('https://images.unsplash.com/photo-1488459716781-6818ecf01d4b?w=1200&h=1600&fit=crop')] bg-cover bg-center px-8 py-10 text-white lg:border-b-0 lg:border-r lg:px-10">
          <p className="text-sm font-medium uppercase tracking-wide text-amber-200">New account</p>
          <h1 className="mt-5 font-serif text-4xl leading-tight">Create your Esca workspace.</h1>
          <p className="mt-5 max-w-md text-lg font-light leading-relaxed text-gray-100">
            Start with a verified account, then connect your kitchen inventory to spoilage predictions and recipe suggestions.
          </p>
          <div className="mt-8 rounded-2xl bg-white/95 p-5 text-gray-900">
            <p className="text-sm text-gray-600">What happens next</p>
            <ul className="mt-3 space-y-3 text-sm font-light leading-relaxed text-gray-700">
              <li>1. Create an account with email and password.</li>
              <li>2. Confirm the verification email from Supabase.</li>
              <li>3. Land in your dashboard with your user profile ready.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center px-6 py-10 sm:px-10">
          <div className="w-full">
            <h2 className="font-serif text-4xl leading-tight">Set up your account</h2>
            <p className="mt-3 text-base font-light leading-relaxed text-gray-600">
              Use a strong password. Esca will redirect verified users to the dashboard automatically.
            </p>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Email</span>
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="email"
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
                  autoComplete="new-password"
                  minLength={8}
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

              {successMessage ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {successMessage}
                </div>
              ) : null}

              <label className="flex items-start gap-3 text-sm font-light leading-relaxed text-gray-600">
                <input
                  className="mt-1 size-4 accent-emerald-900"
                  checked={hasAcceptedLegalTerms}
                  onChange={(event) => setHasAcceptedLegalTerms(event.target.checked)}
                  required
                  type="checkbox"
                />
                <span>
                  I agree to the{' '}
                  <Link className="font-medium text-emerald-900 underline decoration-emerald-400 underline-offset-4" href="/legal/terms" rel="noopener noreferrer" target="_blank">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link className="font-medium text-emerald-900 underline decoration-emerald-400 underline-offset-4" href="/legal/privacy" rel="noopener noreferrer" target="_blank">
                    Privacy Policy
                  </Link>.
                </span>
              </label>

              <button
                className="w-full rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                type="submit"
                disabled={isSubmitting || !hasAcceptedLegalTerms}
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-sm font-light text-gray-600">
              Already registered?{' '}
              <Link className="font-medium text-emerald-900 underline decoration-emerald-400 underline-offset-4" href="/auth/login">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}