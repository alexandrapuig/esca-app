'use client';

import { useEffect, useState } from 'react';

import { deleteAccount, getUserProfile, getUserStats, updateUserProfile } from '@/lib/api';
import { signOut } from '@/lib/supabase';
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
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setErrorMessage('');

    const result = await deleteAccount();

    if (!result.success) {
      setErrorMessage(result.error);
      setIsDeleting(false);
      return;
    }

    await signOut();
    window.location.href = '/';
  }

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
      <main className="flex min-h-screen items-center justify-center bg-white px-6 py-16 text-gray-900">
        <section className="w-full max-w-xl rounded-2xl border border-gray-200 p-10">
          <div className="h-3 w-24 animate-pulse rounded-full bg-gray-200" />
          <div className="mt-6 h-10 w-3/4 animate-pulse rounded-full bg-gray-100" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Profile</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight">Account &amp; preferences</h1>
        </header>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {saveMessage}
          </div>
        ) : null}

        <section className="rounded-2xl border border-gray-200 p-6 md:p-8">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Account information</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-900">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-500"
              />
            </div>
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-900">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 p-6 md:p-8">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Dietary preferences</p>
          <p className="mt-2 text-sm font-light text-gray-600">Select all that apply.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {DIETARY_OPTIONS.map((option) => {
              const active = dietaryRestrictions.includes(option.id);
              return (
                <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleDietaryRestriction(option.id)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </section>

        {stats ? (
          <section className="rounded-2xl border border-gray-200 p-6 md:p-8">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Your impact</p>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
                <p className="text-sm text-gray-600">Items consumed</p>
                <p className="mt-2 text-2xl font-semibold">{stats.items_consumed_count}</p>
              </div>
              <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5">
                <p className="text-sm text-gray-600">Waste prevented</p>
                <p className="mt-2 text-2xl font-semibold">{stats.waste_prevented_kg} kg</p>
              </div>
              <div className="rounded-2xl border-2 border-teal-200 bg-teal-50 p-5">
                <p className="text-sm text-gray-600">CO₂ saved</p>
                <p className="mt-2 text-2xl font-semibold">{stats.co2_saved_kg} kg</p>
              </div>
              <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-5">
                <p className="text-sm text-gray-600">Money saved</p>
                <p className="mt-2 text-2xl font-semibold">${stats.money_saved}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-red-200 p-6 md:p-8">
          <p className="text-sm font-medium uppercase tracking-wide text-red-700">Danger zone</p>
          <h2 className="mt-4 font-serif text-2xl">Delete account</h2>
          <p className="mt-3 text-sm font-light text-gray-600">
            This permanently deletes your account, your inventory, and all associated data.
            It cannot be undone.
          </p>
          <label className="mt-6 mb-3 block text-sm font-medium text-gray-900">
            Type <span className="font-mono">{email}</span> to confirm
          </label>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            placeholder={email}
            className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-3 text-gray-900 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== email || isDeleting}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-red-700 px-6 py-3 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeleting ? 'Deleting...' : 'Delete my account'}
          </button>
        </section>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </main>
  );
}
