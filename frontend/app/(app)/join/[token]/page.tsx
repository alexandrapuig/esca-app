'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getHousehold, joinHousehold, type HouseholdSummary } from '@/lib/api';

export default function JoinHouseholdPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [current, setCurrent] = useState<HouseholdSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [joined, setJoined] = useState(false);

  // Loaded so the warning can say how much is about to move, rather than
  // asking someone to agree to something vague.
  useEffect(() => {
    async function load() {
      const result = await getHousehold();

      if (result.success) {
        setCurrent(result.data);
      }

      setIsLoading(false);
    }

    void load();
  }, []);

  async function handleJoin() {
    setErrorMessage('');
    setIsJoining(true);

    const result = await joinHousehold(token);

    setIsJoining(false);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    setJoined(true);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f6f1e8] px-6 py-10 text-gray-900 md:px-12 md:py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Household invite</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight">Join this household</h1>
        </header>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        {joined ? (
          <section className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-8">
            <h2 className="font-serif text-2xl leading-snug text-gray-900">You're in</h2>
            <p className="mt-2 text-sm font-light text-gray-700">
              Your items moved across. Everyone in the household now shares the same inventory.
            </p>
            <Link
              href="/inventory"
              className="mt-6 inline-flex rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              Go to inventory
            </Link>
          </section>
        ) : (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
            <p className="text-sm font-light leading-relaxed text-gray-700">
              Joining shares one inventory, one set of recipes, and one impact total with everyone
              already in the household.
            </p>

            {!isLoading && current && current.members.length > 1 ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                You are currently in a household with {current.members.length} people. Joining will move
                you out of it.
              </p>
            ) : null}

            <p className="mt-4 text-sm font-light text-gray-600">
              Anything currently in your own fridge moves into this household with you. Nothing is lost,
              but your old household goes away.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleJoin}
                disabled={isJoining || !token}
                className="rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isJoining ? 'Joining...' : 'Join household'}
              </button>
              <Link
                href="/dashboard"
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 transition hover:border-gray-400"
              >
                Not now
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
