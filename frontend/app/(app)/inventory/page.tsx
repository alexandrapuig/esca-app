'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  deleteFridgeItem,
  generatePredictions,
  getFridgeItems,
  getLatestPredictions,
  type FridgeItem,
  type SpoilagePrediction,
  updateFridgeItemStatus,
} from '@/lib/api';

function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return '-';
  }

  // purchase_date and estimated_expiry are plain YYYY-MM-DD values with no time
  // component. new Date('2026-09-02') parses as midnight UTC, which
  // toLocaleDateString then renders in local time — one day earlier anywhere
  // west of Greenwich. Build the date from the parts instead.
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);

  if (parts) {
    const [, year, month, day] = parts;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
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
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'fresh' | 'consumed' | 'expired'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isPredicting, setIsPredicting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [predictions, setPredictions] = useState<SpoilagePrediction[]>([]);
  const flashMessage =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') === 'added'
      ? 'Item added to your fridge inventory.'
      : '';

  useEffect(() => {
    async function loadItems() {
      setIsLoading(true);
      setErrorMessage('');

      const result = await getFridgeItems(statusFilter === 'all' ? undefined : statusFilter);
      const predictionResult = await getLatestPredictions();

      if (!result.success) {
        setErrorMessage(result.error);
        setItems([]);
        setIsLoading(false);
        return;
      }

      setItems(result.data);
      setPredictions(predictionResult.success ? predictionResult.data : []);
      setIsLoading(false);
    }

    void loadItems();
  }, [statusFilter]);

  const hasItems = useMemo(() => items.length > 0, [items]);

  function getPredictionForItem(itemId: string): SpoilagePrediction | null {
    return predictions.find((prediction) => prediction.item_id === itemId) ?? null;
  }

  // risk_level is computed by the backend from estimated_expiry. Deriving it
  // again here would mean two copies of the same rule, and any change to the
  // backend thresholds would silently not apply.
  function getRiskBadgeStyles(prediction: SpoilagePrediction | null): string {
    if (!prediction) {
      return 'bg-stone-100 text-stone-700';
    }

    if (prediction.risk_level === 'high') {
      return 'bg-red-100 text-red-800';
    }

    if (prediction.risk_level === 'medium') {
      return 'bg-amber-100 text-amber-900';
    }

    return 'bg-emerald-100 text-emerald-800';
  }

  function getRiskLabel(prediction: SpoilagePrediction | null): string {
    if (!prediction) {
      return 'No prediction';
    }

    if (prediction.risk_level === 'high') {
      return 'High risk';
    }

    if (prediction.risk_level === 'medium') {
      return 'Medium risk';
    }

    return 'Low risk';
  }

  async function handleGeneratePredictions() {
    setErrorMessage('');
    setIsPredicting(true);

    const result = await generatePredictions();

    if (!result.success) {
      setErrorMessage(result.error);
      setIsPredicting(false);
      return;
    }

    setPredictions(result.data);
    setIsPredicting(false);
  }

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
    <main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Fridge inventory</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight">Track what is in your kitchen</h1>
            <p className="mt-3 max-w-2xl text-base font-light leading-relaxed text-gray-600">
              Keep tabs on what is fresh, consumed, or expired so Esca can guide smarter shopping and cooking.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/recipes"
              className="inline-flex items-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:border-gray-400"
            >
              View recipes
            </Link>
            <Link
              href="/inventory/add"
              className="inline-flex items-center rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              Add new item
            </Link>
          </div>
        </header>

        {flashMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            {flashMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        <section className="rounded-2xl border border-gray-200 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Filter status:</span>
            {(['all', 'fresh', 'consumed', 'expired'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  statusFilter === value
                    ? 'bg-emerald-900 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
            <button
              type="button"
              onClick={handleGeneratePredictions}
              disabled={isPredicting}
              className="ml-auto rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPredicting ? 'Updating predictions...' : 'Update predictions'}
            </button>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-4">
              <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
              <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
            </div>
          ) : null}

          {!isLoading && !hasItems ? (
            <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
              <p className="font-serif text-2xl leading-snug text-gray-900">No items yet</p>
              <p className="mt-2 text-sm font-light text-gray-600">Start by adding your first fridge item.</p>
              <Link
                href="/inventory/add"
                className="mt-5 inline-flex rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
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
                      <th className="px-4 py-3">Spoilage risk</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {items.map((item) => (
                      <tr key={item.id} className="align-top">
                        {(() => {
                          const prediction = getPredictionForItem(item.id);

                          return (
                            <>
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
                        <td className="px-4 py-4 text-xs text-stone-700">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeStyles(prediction)}`}>
                            {getRiskLabel(prediction)}
                          </span>
                          <p className="mt-2">Days until expiry: {prediction ? prediction.days_until_expiry : '-'}</p>
                          <p>Confidence: {prediction ? `${Math.round(prediction.confidence_score * 100)}%` : '-'}</p>
                          <p className="mt-1 max-w-[20rem] text-stone-600">{prediction?.reasoning ?? 'Generate predictions to view reasoning.'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
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
                            </>
                          );
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-4 md:hidden">
                {items.map((item) => {
                  const prediction = getPredictionForItem(item.id);

                  return (
                    <article key={`${item.id}-card`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-stone-900">{item.name}</h2>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${itemStatusStyles(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeStyles(prediction)}`}>
                      {getRiskLabel(prediction)}
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{item.category ?? 'other'}</p>
                    <p className="mt-2 text-sm text-stone-600">Purchased: {formatDate(item.purchaseDate)}</p>
                    <p className="mt-1 text-sm text-stone-600">Expiry: {formatDate(item.estimatedExpiry)}</p>
                    <p className="mt-1 text-sm text-stone-600">Days until expiry: {prediction ? prediction.days_until_expiry : '-'}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      Confidence: {prediction ? `${Math.round(prediction.confidence_score * 100)}%` : '-'}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">{prediction?.reasoning ?? 'Generate predictions to view reasoning.'}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      Quantity: {item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : '-'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
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
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
