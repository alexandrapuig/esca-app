'use client';

import Footer from '@/components/Footer';
import { useCookieConsent } from '@/components/CookieConsent';

const cookies = [
  ['sb-*-auth-token', 'Supabase auth', 'Strictly necessary', 'Session'],
  ['esca_cookie_consent', 'Esca', 'Strictly necessary', '180 days'],
  ['ph_*', 'PostHog analytics', 'Optional', '365 days'],
];

export default function CookiesPage() {
  const { consent, openSettings } = useCookieConsent();
  const currentSetting = consent ? (consent.analytics ? 'Analytics enabled' : 'Necessary cookies only') : 'No preference saved yet';

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-900">Legal</p>
        <h1 className="mt-3 font-serif text-4xl text-emerald-900 sm:text-5xl">Cookie Policy</h1>
        <p className="mt-4 max-w-2xl font-light leading-relaxed text-gray-600">Esca uses a small number of cookies to keep your account secure and, if you choose, understand service usage.</p>
        <div className="mt-10 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-full text-left text-sm"><thead className="bg-gray-50 font-medium text-gray-900"><tr><th className="px-4 py-3">Cookie</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Duration</th></tr></thead><tbody>{cookies.map(([name, provider, category, duration]) => <tr className="border-t border-gray-200" key={name}><td className="px-4 py-3 font-medium text-gray-900">{name}</td><td className="px-4 py-3 font-light text-gray-600">{provider}</td><td className="px-4 py-3 font-light text-gray-600">{category}</td><td className="px-4 py-3 font-light text-gray-600">{duration}</td></tr>)}</tbody></table>
        </div>
        <section className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
          <h2 className="font-serif text-2xl text-emerald-900">Your current setting</h2>
          <p className="mt-3 font-light text-gray-600">{currentSetting}</p>
          <button className="mt-5 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800" onClick={openSettings} type="button">Change your cookie settings</button>
        </section>
      </main>
      <Footer />
    </div>
  );
}