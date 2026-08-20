'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type CookieConsent = {
  necessary: true;
  analytics: boolean;
};

type CookieConsentContextValue = {
  consent: CookieConsent | null;
  updateConsent: (consent: CookieConsent) => void;
  openSettings: () => void;
};

const COOKIE_NAME = 'esca_cookie_consent';
const COOKIE_MAX_AGE = 15552000;

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function readConsent(): CookieConsent | null {
  const encodedValue = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1];

  if (!encodedValue) return null;

  try {
    const value = JSON.parse(decodeURIComponent(encodedValue)) as CookieConsent;
    return value.necessary === true && typeof value.analytics === 'boolean' ? value : null;
  } catch {
    return null;
  }
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const savedConsent = readConsent();
    setConsent(savedConsent);
    setAnalytics(savedConsent?.analytics ?? false);
    setIsReady(true);
  }, []);

  function updateConsent(nextConsent: CookieConsent) {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(nextConsent))}; Path=/; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
    setConsent(nextConsent);
    setAnalytics(nextConsent.analytics);
    setIsSettingsOpen(false);
    window.dispatchEvent(new CustomEvent('esca:consent-changed', { detail: nextConsent }));
  }

  function openSettings() {
    setAnalytics(consent?.analytics ?? false);
    setIsSettingsOpen(true);
  }

  return (
    <CookieConsentContext.Provider value={{ consent, updateConsent, openSettings }}>
      {children}
      {isReady && (!consent || isSettingsOpen) ? (
        <section className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-4 shadow-2xl backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="font-serif text-lg text-emerald-900">Your privacy choices</p>
              <p className="mt-1 text-sm font-light leading-relaxed text-gray-600">
                Esca uses strictly necessary cookies to keep your account secure. Analytics remain off unless you choose to enable them.
              </p>
              {isSettingsOpen ? (
                <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <label className="flex items-start justify-between gap-4">
                    <span>
                      <span className="block text-sm font-medium text-gray-900">Strictly necessary</span>
                      <span className="block text-sm font-light text-gray-600">Required for security, authentication, and saving this choice.</span>
                    </span>
                    <input aria-label="Strictly necessary cookies" checked disabled type="checkbox" />
                  </label>
                  <label className="flex items-start justify-between gap-4">
                    <span>
                      <span className="block text-sm font-medium text-gray-900">Analytics</span>
                      <span className="block text-sm font-light text-gray-600">Helps us understand how the service is used.</span>
                    </span>
                    <input aria-label="Analytics cookies" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} type="checkbox" />
                  </label>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {!isSettingsOpen ? (
                <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-emerald-900 hover:text-emerald-900" onClick={openSettings} type="button">
                  Customize
                </button>
              ) : null}
              <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-emerald-900 hover:text-emerald-900" onClick={() => updateConsent({ necessary: true, analytics: false })} type="button">
                Necessary only
              </button>
              {isSettingsOpen ? (
                <button className="rounded-lg border border-emerald-900 bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800" onClick={() => updateConsent({ necessary: true, analytics })} type="button">
                  Save preferences
                </button>
              ) : (
                <button className="rounded-lg border border-emerald-900 bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800" onClick={() => updateConsent({ necessary: true, analytics: true })} type="button">
                  Accept all
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);

  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider.');
  }

  return context;
}