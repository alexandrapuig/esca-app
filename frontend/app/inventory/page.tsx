'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { deleteFridgeItem, getFridgeItems, type FridgeItem, updateFridgeItemStatus } from '@/lib/api';

function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return '-';
  }

  return new Date(dateValue).toLocaleDateString();
}

function itemStatusStyles(status: FridgeItem['status']): string {
  if (status === 'consumed') {
    return 'bg-emerald-100 text-emerald-800';
  }

  if (status === 'expired') {
    return 'bg-red-100 text-red-800';
  }

  return 'bg-amber-100 text-amber-800';
}

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'fresh' | 'consumed' | 'expired'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const flashMessage = searchParams.get('success') === 'added' ? 'Item added to your fridge inventory.' : '';

  useEffect(() => {
    async function loadItems() {
      setIsLoading(true);
      setErrorMessage('');

      const result = await getFridgeItems(statusFilter === 'all' ? undefined : statusFilter);

      if (!result.success) {
        setErrorMessage(result.error);
        setItems([]);
        setIsLoading(false);
        return;
      }

      setItems(result.data);
      setIsLoading(false);
    }

    void loadItems();
  }, [statusFilter]);

  const hasItems = useMemo(() => items.length > 0, [items]);

  async function handleStatusUpdate(itemId: string, status: 'consumed' | 'expired' | 'fresh') {
    setErrorMessage('');
    const result = await updateFridgeItemStatus(itemId, status);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    setItems((current) => current.map((item) => (item.id === itemId ? result.data : item)));
  }

  async function handleDelete(itemId: string) {
    setErrorMessage('');
    const result = await deleteFridgeItem(itemId);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7f2e8_0%,_#f4f6ee_50%,_#ffffff_100%)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-[2rem] bg-stone-900 px-8 py-8 text-stone-100 shadow-[0_24px_80px_rgba(38,29,18,0.18)]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Fridge inventory</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">Track what is in your kitchen</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-300">
                Keep tabs on what is fresh, consumed, or expired so Esca can guide smarter shopping and cooking.
              </p>
            </div>

            <Link
              href="/inventory/add"
              className="inline-flex rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-amber-200"
            >
              Add new item
            </Link>
          </div>
        </header>

        {flashMessage ? (
          <div className="rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            {flashMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[1.3rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_12px_40px_rgba(69,48,17,0.08)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-stone-600">Filter status:</span>
            {(['all', 'fresh', 'consumed', 'expired'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  statusFilter === value
                    ? 'bg-stone-900 text-white'
                    : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-500'
                }`}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-4">
              <div className="h-16 animate-pulse rounded-2xl bg-stone-100" />
              <div className="h-16 animate-pulse rounded-2xl bg-stone-100" />
            </div>
          ) : null}

          {!isLoading && !hasItems ? (
            <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center">
              <p className="text-lg font-semibold text-stone-800">No items yet</p>
              <p className="mt-2 text-sm text-stone-600">Start by adding your first fridge item.</p>
              <Link
                href="/inventory/add"
                className="mt-5 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
              >
                Add an item
              </Link>
            </div>
          ) : null}

          {!isLoading && hasItems ? (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 md:block">
                <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                  <thead className="bg-stone-100 text-xs uppercase tracking-[0.18em] text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Purchase date</th>
                      <th className="px-4 py-3">Estimated expiry</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {items.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-4 font-semibold text-stone-900">{item.name}</td>
                        <td className="px-4 py-4 text-stone-700">{item.category ?? '-'}</td>
                        <td className="px-4 py-4 text-stone-700">{formatDate(item.purchaseDate)}</td>
                        <td className="px-4 py-4 text-stone-700">{formatDate(item.estimatedExpiry)}</td>
                        <td className="px-4 py-4 text-stone-700">
                          {item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '-'}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${itemStatusStyles(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 transition hover:border-stone-500"
                              onClick={() => handleStatusUpdate(item.id, 'fresh')}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                              onClick={() => handleStatusUpdate(item.id, 'consumed')}
                            >
                              Mark consumed
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                              onClick={() => handleDelete(item.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-4 md:hidden">
                {items.map((item) => (
                  <article key={`${item.id}-card`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-stone-900">{item.name}</h2>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${itemStatusStyles(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{item.category ?? 'other'}</p>
                    <p className="mt-2 text-sm text-stone-600">Purchased: {formatDate(item.purchaseDate)}</p>
                    <p className="mt-1 text-sm text-stone-600">Expiry: {formatDate(item.estimatedExpiry)}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      Quantity: {item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '-'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700"
                        onClick={() => handleStatusUpdate(item.id, 'fresh')}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700"
                        onClick={() => handleStatusUpdate(item.id, 'consumed')}
                      >
                        Mark consumed
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
