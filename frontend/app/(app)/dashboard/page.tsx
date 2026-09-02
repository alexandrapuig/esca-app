'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getCurrentUser } from '@/lib/supabase';
import { getUserStats, type UserStats } from '@/lib/api';

const STAT_CARDS: Array<{
  title: string;
  key: keyof UserStats;
  icon: string;
  colors: string;
  unit?: string;
}> = [
  { title: 'Items Consumed', key: 'items_consumed_count', icon: '📦', colors: 'bg-amber-50 border-amber-100' },
  { title: 'Waste Prevented', key: 'waste_prevented_kg', icon: '♻️', colors: 'bg-green-50 border-green-100', unit: 'kg' },
  { title: 'CO₂ Saved', key: 'co2_saved_kg', icon: '🌍', colors: 'bg-teal-50 border-teal-100', unit: 'kg' },
  { title: 'Money Saved', key: 'money_saved', icon: '💰', colors: 'bg-purple-50 border-purple-100', unit: '$' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const user = await getCurrentUser();

        if (!user?.email) {
          router.replace('/auth/login');
          return;
        }

        const statsResult = await getUserStats();

        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f1e8] px-6 py-16 text-stone-900">
        <section className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-10 shadow-[0_24px_80px_rgba(92,69,33,0.12)]">
          <div className="h-3 w-24 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-6 h-10 w-3/4 animate-pulse rounded-full bg-stone-100" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-stone-100" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-stone-100" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Welcome Back</p>
          <h1 className="mt-4 font-serif text-5xl leading-tight">Your Food, Your Impact</h1>
          <p className="mt-4 max-w-2xl text-lg font-light leading-relaxed text-gray-600">
            Track your inventory, reduce waste, and discover recipes that celebrate what you have.
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        {stats ? (
          <section className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
            {STAT_CARDS.map((card) => (
              <div key={card.key} className={`rounded-2xl border-2 p-6 md:p-8 ${card.colors}`}>
                <p className="text-2xl">{card.icon}</p>
                <p className="mt-4 text-sm text-gray-600">{card.title}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {card.unit === '$' ? `$${stats[card.key]}` : `${stats[card.key]}${card.unit ? ` ${card.unit}` : ''}`}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="grid gap-6 md:gap-8 lg:grid-cols-3">
          <Link
            href="/inventory/add"
            className="rounded-2xl border border-gray-200 p-6 transition hover:shadow-lg md:p-8"
          >
            <p className="text-2xl">+</p>
            <h2 className="mt-4 font-serif text-2xl leading-snug">Add Item</h2>
            <p className="mt-2 text-sm font-light leading-relaxed text-gray-600">
              Start tracking your fresh produce and pantry items
            </p>
          </Link>

          <Link href="/inventory" className="rounded-2xl border border-gray-200 p-6 transition hover:shadow-lg md:p-8">
            <p className="text-2xl">📦</p>
            <h2 className="mt-4 font-serif text-2xl leading-snug">Your Inventory</h2>
            <p className="mt-2 text-sm font-light leading-relaxed text-gray-600">
              Manage and monitor all your tracked items
            </p>
          </Link>

          <Link href="/recipes" className="rounded-2xl border border-gray-200 p-6 transition hover:shadow-lg md:p-8">
            <p className="text-2xl">🍳</p>
            <h2 className="mt-4 font-serif text-2xl leading-snug">Discover Recipes</h2>
            <p className="mt-2 text-sm font-light leading-relaxed text-gray-600">
              AI-powered recipes from your expiring items
            </p>
          </Link>
        </section>

        <p className="pb-8 text-center text-sm font-light text-gray-500">Track what you have. Waste less. Live well.</p>
      </div>
    </main>
  );
}
