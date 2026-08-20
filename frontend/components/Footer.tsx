'use client';

import Link from 'next/link';

import { useCookieConsent } from './CookieConsent';

export default function Footer() {
  const { openSettings } = useCookieConsent();

  return (
    <footer className="border-t border-gray-200 px-6 py-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 text-center text-sm font-light text-gray-600 sm:flex-row sm:text-left">
        <p>Copyright {new Date().getFullYear()} Esca. Thoughtful food, less waste.</p>
        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link className="transition hover:text-emerald-900" href="/legal/terms">Terms</Link>
          <Link className="transition hover:text-emerald-900" href="/legal/privacy">Privacy</Link>
          <Link className="transition hover:text-emerald-900" href="/legal/cookies">Cookies</Link>
          <button className="transition hover:text-emerald-900" onClick={openSettings} type="button">Cookie settings</button>
        </nav>
      </div>
    </footer>
  );
}