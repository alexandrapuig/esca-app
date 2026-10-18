'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useState } from 'react';

import { addFridgeItem, identifyItemImage } from '@/lib/api';
import {
  CATEGORIES,
  MAX_PHOTOS,
  normalizeImageFile,
  SIZE_UNITS,
  type ReviewItem,
} from '@/lib/inventory';

export default function BulkAddPage() {
  const router = useRouter();

  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [readingSourceKind, setReadingSourceKind] = useState<'physical_item' | 'listing' | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoProgress, setPhotoProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset immediately so picking the same files twice still fires onChange.
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    setErrorMessage('');
    setReviewItems([]);

    if (files.length > MAX_PHOTOS) {
      setErrorMessage(`Up to ${MAX_PHOTOS} photos at a time. The first ${MAX_PHOTOS} were read.`);
    }

    const chosen = files.slice(0, MAX_PHOTOS);
    setIsIdentifying(true);
    setPhotoProgress(chosen.length > 1 ? `Reading ${chosen.length} photos...` : 'Reading...');

    try {
      // One Claude call per image, run together: wall-clock time stays near
      // one image's cost. allSettled so a single bad file does not discard
      // the readings from the others.
      const settled = await Promise.allSettled(
        chosen.map(async (file) => {
          const image = await normalizeImageFile(file);
          return identifyItemImage({ image, media_type: 'image/jpeg' });
        }),
      );

      const collected: ReviewItem[] = [];
      const failures: string[] = [];
      let lastSourceKind: 'physical_item' | 'listing' | null = null;

      settled.forEach((outcome, index) => {
        if (outcome.status === 'rejected') {
          failures.push(chosen[index]?.name ?? `photo ${index + 1}`);
          return;
        }

        if (!outcome.value.success) {
          failures.push(`${chosen[index]?.name ?? `photo ${index + 1}`}: ${outcome.value.error}`);
          return;
        }

        lastSourceKind = outcome.value.data.source_kind;

        outcome.value.data.items.forEach((item, itemIndex) => {
          // Duplicates across overlapping screenshots are kept deliberately:
          // a visible repeated row can be unticked, where a silent dedupe on
          // a near-matching name would quietly drop something real.
          collected.push({ ...item, rowId: `${index}-${itemIndex}-${Date.now()}`, include: true });
        });
      });

      setReadingSourceKind(lastSourceKind);

      if (collected.length === 0) {
        setErrorMessage(
          failures.length > 0
            ? failures.join(' · ')
            : 'No items could be read from those photos. Try a clearer shot, or add them one at a time.',
        );
        return;
      }

      if (failures.length > 0) {
        setErrorMessage(`Some photos could not be read: ${failures.join(' · ')}`);
      }

      setReviewItems(collected);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Those photos could not be read.');
    } finally {
      setIsIdentifying(false);
      setPhotoProgress('');
    }
  }

  function updateReviewItem(rowId: string, changes: Partial<ReviewItem>) {
    setReviewItems((previous) =>
      previous.map((item) => (item.rowId === rowId ? { ...item, ...changes } : item)),
    );
  }

  async function handleAddReviewed() {
    const chosen = reviewItems.filter((item) => item.include);

    if (chosen.length === 0) {
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const failed: string[] = [];
    let added = 0;

    for (const item of chosen) {
      const itemName = (item.name ?? '').trim();

      if (!itemName) {
        failed.push('an unnamed row');
        continue;
      }

      const result = await addFridgeItem({
        name: itemName,
        category: item.category ?? 'other',
        quantity: item.quantity ?? undefined,
        size: item.size ?? undefined,
        size_unit: item.size_unit ?? undefined,
        typical_shelf_life_days: item.typical_shelf_life_days ?? undefined,
        brand: item.brand ?? undefined,
        purchase_date: purchaseDate || undefined,
        // purchase_price is the LINE TOTAL as printed, which is what
        // getUserStats sums for consumed rows. Do not divide it by quantity
        // here or money saved undercounts.
        purchase_price: item.price ?? undefined,
        // Only set when a per-unit rate was actually printed on the listing,
        // such as a per-pound price beside a weighed item.
        unit_price: item.unit_price ?? undefined,
        // Nothing here sets an expiry: a listing carries no date for the
        // item in your fridge, and the backend computes one from shelf life.
      });

      if (result.success) {
        added += 1;
      } else {
        failed.push(itemName);
      }
    }

    setIsSubmitting(false);

    if (failed.length > 0) {
      // Drop the rows that landed so a retry does not add them twice.
      setReviewItems((previous) => previous.filter((item) => failed.includes((item.name ?? '').trim())));
      setErrorMessage(
        `Added ${added} of ${chosen.length}. These could not be added: ${failed.join(', ')}. They are still listed above.`,
      );
      return;
    }

    setReviewItems([]);
    router.push('/inventory?success=added');
    router.refresh();
  }

  const includedCount = reviewItems.filter((item) => item.include).length;

  return (
    <main className="min-h-screen bg-[#f6f1e8] px-6 py-10 text-gray-900 md:px-12 md:py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Add to inventory</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight">Add a whole shop</h1>
          <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-gray-600">
            Upload a screenshot of your order, a receipt, or photos of what you bought. Check what comes
            back before anything is saved.
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
          <label className="block">
            <span className="mb-3 block text-sm font-medium text-gray-900">Purchase date</span>
            <input
              className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </label>
          <p className="mt-2 text-xs font-light text-gray-500">
            Applied to everything in this upload. Expiry dates are worked out from it.
          </p>

          <div className="mt-6">
            <span className="mb-3 block text-sm font-medium text-gray-900">Screenshots or photos</span>
            <input
              className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-800"
              type="file"
              accept="image/*"
              multiple
              disabled={isIdentifying}
              onChange={handlePhotoSelected}
            />
            <p className="mt-2 text-xs font-light text-gray-500">
              Up to {MAX_PHOTOS} at a time. A cart screenshot usually reads better than a photo of a receipt.
            </p>
            {isIdentifying ? (
              <p className="mt-3 text-sm font-medium text-emerald-800">{photoProgress || 'Reading...'}</p>
            ) : null}
          </div>
        </section>

        {reviewItems.length > 0 ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
            <p className="text-sm font-medium text-gray-900">{reviewItems.length} items read</p>
            <p className="mt-1 text-xs font-light text-gray-600">
              Check each one before adding. Untick anything you do not want, and edit anything that came back
              wrong.
              {readingSourceKind === 'listing'
                ? ' No expiry dates were taken: a screenshot shows a picture of a product, not the one in your fridge.'
                : ''}
            </p>

            <div className="mt-6 space-y-3">
              {reviewItems.map((item) => (
                <div
                  key={item.rowId}
                  className={`rounded-lg border p-3 transition ${
                    item.include ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.include}
                      onChange={(event) => updateReviewItem(item.rowId, { include: event.target.checked })}
                      className="mt-3 h-4 w-4 shrink-0 accent-emerald-900"
                      aria-label={`Include ${item.name ?? 'this item'}`}
                    />
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-700">Name</span>
                        <input
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          type="text"
                          value={item.name ?? ''}
                          onChange={(event) => updateReviewItem(item.rowId, { name: event.target.value })}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-700">Category</span>
                        <select
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          value={item.category ?? 'other'}
                          onChange={(event) => updateReviewItem(item.rowId, { category: event.target.value })}
                        >
                          {CATEGORIES.map((option) => (
                            <option key={option} value={option}>
                              {option[0].toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-gray-700">Qty</span>
                          <input
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            type="text"
                            inputMode="decimal"
                            placeholder="1"
                            value={item.quantity ?? ''}
                            onChange={(event) =>
                              updateReviewItem(item.rowId, {
                                quantity: event.target.value.trim() ? Number(event.target.value) : null,
                              })
                            }
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-gray-700">Size</span>
                          <input
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            type="text"
                            inputMode="decimal"
                            value={item.size ?? ''}
                            onChange={(event) =>
                              updateReviewItem(item.rowId, {
                                size: event.target.value.trim() ? Number(event.target.value) : null,
                              })
                            }
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-gray-700">Unit</span>
                          <select
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            value={item.size_unit ?? ''}
                            onChange={(event) =>
                              updateReviewItem(item.rowId, { size_unit: event.target.value || null })
                            }
                          >
                            <option value="">—</option>
                            {SIZE_UNITS.map((option) => (
                              <option key={option} value={option}>
                                {option === 'other' ? 'Other' : option}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAddReviewed}
                disabled={isSubmitting || includedCount === 0}
                className="rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isSubmitting ? 'Adding...' : `Add ${includedCount} items`}
              </button>
              <button
                type="button"
                onClick={() => setReviewItems([])}
                className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-400"
              >
                Discard
              </button>
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-4">
          <Link href="/inventory/add" className="text-sm font-medium text-gray-600 underline transition hover:text-gray-900">
            Back
          </Link>
          <Link href="/inventory/add/single" className="text-sm font-medium text-gray-600 underline transition hover:text-gray-900">
            Add just one item
          </Link>
        </div>
      </div>
    </main>
  );
}
