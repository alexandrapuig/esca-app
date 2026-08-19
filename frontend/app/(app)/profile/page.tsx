'use client';

import { useEffect, useState } from 'react';

import { getUserProfile, getUserStats, updateUserProfile } from '@/lib/api';
import type { UserStats } from '@/lib/api';

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'nut-free', label: 'Nut-free' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'keto', label: 'Keto' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
];

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const [profileResult, statsResult] = await Promise.all([getUserProfile(), getUserStats()]);

      if (profileResult.success) {
        setEmail(profileResult.data.email);
        setName(profileResult.data.name ?? '');
        setDietaryRestrictions(profileResult.data.dietary_restrictions);
      } else {
        setErrorMessage(profileResult.error);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      }

      setIsLoading(false);
    }

    void loadProfile();
  }, []);

  function toggleDietaryRestriction(id: string) {
    setDietaryRestrictions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage('');
    setSaveMessage('');

    const result = await updateUserProfile({ name, dietary_restrictions: dietaryRestrictions });

    if (!result.success) {
      setErrorMessage(result.error);
    } else {
      setSaveMessage('Profile updated.');
    }

    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f1e8] px-6 py-16 text-stone-900">
        <section className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-10 shadow-[0_24px_80px_rgba(92,69,33,0.12)]">
          <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-6 h-10 w-3/4 animate-pulse rounded-full bg-stone-100" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f0e5d0_0%,_#f7f2ea_42%,_#ffffff_100%)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="rounded-[2rem] bg-stone-900 px-8 py-8 text-stone-100 shadow-[0_24px_80px_rgba(38,29,18,0.18)]">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Profile</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Account &amp; preferences</h1>
        </header>

        {errorMessage ? (
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {saveMessage}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(69,48,17,0.08)]">
          <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Account details</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-stone-500">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-[1rem] border border-stone-200 bg-stone-100 px-4 py-3 text-stone-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-stone-500">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-[1rem] border border-stone-200 px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_12px_40px_rgba(69,48,17,0.08)]">
          <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Dietary preferences</p>
          <p className="mt-2 text-sm text-stone-500">Select all that apply.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DIETARY_OPTIONS.map((option) => {
              const active = dietaryRestrictions.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleDietaryRestriction(option.id)}
                  className={
                    active
                      ? 'rounded-full border-2 border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-stone-900'
                      : 'rounded-full border-2 border-stone-200 px-4 py-2 text-sm text-stone-500 hover:border-stone-300'
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        {stats ? (
          <section className="rounded-[2rem] border border-stone-200 bg-[#f6efe1] p-8 shadow-[0_12px_40px_rgba(69,48,17,0.08)]">
            <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Your impact</p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-[1.5rem] bg-white p-5">
                <p className="text-sm text-stone-500">Items consumed</p>
                <p className="mt-2 text-2xl font-semibold">{stats.items_consumed_count}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5">
                <p className="text-sm text-stone-500">Waste prevented</p>
                <p className="mt-2 text-2xl font-semibold">{stats.waste_prevented_kg} kg</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5">
                <p className="text-sm text-stone-500">CO₂ saved</p>
                <p className="mt-2 text-2xl font-semibold">{stats.co2_saved_kg} kg</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5">
                <p className="text-sm text-stone-500">Money saved</p>
                <p className="mt-2 text-2xl font-semibold">${stats.money_saved}</p>
              </div>
            </div>
          </section>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSaving ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </main>
  );
}
