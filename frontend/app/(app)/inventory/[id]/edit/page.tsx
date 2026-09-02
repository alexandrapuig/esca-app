'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { getFridgeItems, updateFridgeItem, type FridgeItem } from '@/lib/api';

const CATEGORIES = ['produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen', 'pantry', 'beverage', 'other'] as const;

export default function EditInventoryItemPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const itemId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('other');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [estimatedExpiry, setEstimatedExpiry] = useState('');
  const [brand, setBrand] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadItem() {
      setIsLoading(true);
      setErrorMessage('');

      // There is no GET /api/fridge/items/:id yet. The list endpoint is already
      // household-scoped and inventories are small, so the item is picked out of
      // the list rather than adding another route to keep in sync.
      const result = await getFridgeItems();

      if (!result.success) {
        setErrorMessage(result.error);
        setIsLoading(false);
        return;
      }

      const item = result.data.find((candidate: FridgeItem) => candidate.id === itemId);

      if (!item) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setName(item.name);
      setCategory(
        CATEGORIES.includes(item.category as (typeof CATEGORIES)[number])
          ? (item.category as (typeof CATEGORIES)[number])
          : 'other',
      );
      setQuantity(item.quantity !== null ? String(item.quantity) : '');
      setUnit(item.unit ?? '');
      setPurchaseDate(item.purchaseDate ?? '');
      setEstimatedExpiry(item.estimatedExpiry ?? '');
      setBrand(item.brand ?? '');
      setPurchaseLocation(item.purchaseLocation ?? '');
      setPurchasePrice(item.purchasePrice !== null ? String(item.purchasePrice) : '');
      setNotes(item.notes ?? '');
      setIsLoading(false);
    }

    void loadItem();
  }, [itemId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Name is required');
      return;
    }

    let parsedQuantity: number | null = null;

    if (quantity.trim()) {
      const value = Number(quantity);

      if (Number.isNaN(value)) {
        setErrorMessage('Quantity must be a number');
        return;
      }

      parsedQuantity = value;
    }

    let parsedPrice: number | null = null;

    if (purchasePrice.trim()) {
      const value = Number(purchasePrice);

      if (Number.isNaN(value) || value < 0) {
        setErrorMessage('Purchase price must be a positive number');
        return;
      }

      parsedPrice = value;
    }

    setIsSubmitting(true);

    // Every field is sent, including empty ones. The backend reads an empty
    // string as a clear, which is what lets a field be blanked out.
    const result = await updateFridgeItem(itemId, {
      name: name.trim(),
      category,
      quantity: parsedQuantity,
      unit: unit.trim() || null,
      estimated_expiry: estimatedExpiry || null,
      purchase_date: purchaseDate || undefined,
      brand: brand.trim() || null,
      purchase_location: purchaseLocation.trim() || null,
      purchase_price: parsedPrice,
      notes: notes.trim() || null,
    });

    if (!result.success) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push('/inventory?success=updated');
    router.refresh();
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl border border-gray-200 p-6 md:p-8">
            <div className="h-3 w-24 animate-pulse rounded-full bg-gray-200" />
            <div className="mt-6 h-10 w-3/4 animate-pulse rounded-full bg-gray-100" />
            <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-gray-100" />
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl border border-gray-200 p-6 text-center md:p-8">
            <p className="font-serif text-2xl leading-snug">Item not found</p>
            <p className="mt-2 text-sm font-light text-gray-600">
              This item may have been deleted or belongs to another household.
            </p>
            <Link
              href="/inventory"
              className="mt-5 inline-flex rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              Back to inventory
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <section className="rounded-2xl border border-gray-200 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Edit item</p>
              <h1 className="mt-2 font-serif text-3xl leading-tight">Update this item</h1>
            </div>
            <Link
              href="/inventory"
              className="inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-gray-400"
            >
              Cancel
            </Link>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-3 block text-sm font-medium text-gray-900">Item Name *</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Category</span>
                <select
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as (typeof CATEGORIES)[number])}
                >
                  {CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option[0].toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Quantity</span>
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Unit</span>
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="text"
                  placeholder="e.g. pcs, kg, ml"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Purchase date</span>
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="date"
                  value={purchaseDate}
                  onChange={(event) => setPurchaseDate(event.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-3 block text-sm font-medium text-gray-900">Estimated expiry</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                type="date"
                value={estimatedExpiry}
                onChange={(event) => setEstimatedExpiry(event.target.value)}
              />
              <span className="mt-2 block text-xs font-light text-gray-600">
                Set this directly when the estimate is wrong. Spoilage risk is calculated from this date.
              </span>
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Brand</span>
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="text"
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Purchased from</span>
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="text"
                  value={purchaseLocation}
                  onChange={(event) => setPurchaseLocation(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Price paid</span>
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="text"
                  inputMode="decimal"
                  value={purchasePrice}
                  onChange={(event) => setPurchasePrice(event.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-3 block text-sm font-medium text-gray-900">Notes</span>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              className="w-full rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving changes...' : 'Save changes'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
