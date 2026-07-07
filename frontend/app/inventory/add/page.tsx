'use client';

import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';

import { addFridgeItem } from '@/lib/api';

const CATEGORIES = ['produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen', 'pantry', 'beverage', 'other'] as const;

function mapBarcodeToCategory(barcodeValue: string): string {
  if (barcodeValue.startsWith('2')) {
    return 'produce';
  }

  if (barcodeValue.startsWith('3')) {
    return 'dairy';
  }

  if (barcodeValue.startsWith('4')) {
    return 'meat';
  }

  return 'other';
}

export default function AddInventoryItemPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('other');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    };
  }, []);

  async function startScanning() {
    setErrorMessage('');
    setIsScanning(true);

    if (!videoRef.current) {
      setErrorMessage('Unable to access camera preview element.');
      setIsScanning(false);
      return;
    }

    const codeReader = new BrowserMultiFormatReader();
    scannerRef.current = codeReader;

    try {
      const result = await codeReader.decodeOnceFromVideoDevice(undefined, videoRef.current);
      const scannedCode = result.getText();
      setScanValue(scannedCode);

      if (!name.trim()) {
        setName(`Item ${scannedCode.slice(-6)}`);
      }

      setCategory(mapBarcodeToCategory(scannedCode) as (typeof CATEGORIES)[number]);
      setIsScanning(false);
      codeReader.reset();
    } catch (error) {
      if (error instanceof NotFoundException) {
        setErrorMessage('No barcode detected yet. Try again with better lighting.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Barcode scan failed');
      }

      setIsScanning(false);
      codeReader.reset();
    }
  }

  function stopScanning() {
    scannerRef.current?.reset();
    setIsScanning(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Name is required');
      return;
    }

    setIsSubmitting(true);

    const parsedQuantity = quantity.trim() ? Number(quantity) : undefined;

    if (parsedQuantity !== undefined && Number.isNaN(parsedQuantity)) {
      setErrorMessage('Quantity must be a number');
      setIsSubmitting(false);
      return;
    }

    const result = await addFridgeItem({
      name,
      category,
      quantity: parsedQuantity,
      unit: unit.trim() || undefined,
    });

    if (!result.success) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push('/inventory?success=added');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f3f0dc,_#e5f0df_45%,_#f9f7f2_100%)] px-6 py-10 text-stone-900">
      <div className="mx-auto w-full max-w-3xl">
        <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_24px_80px_rgba(55,69,42,0.14)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-700">Add item</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Add to your fridge inventory</h1>
            </div>
            <Link
              href="/inventory"
              className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-500"
            >
              Back to inventory
            </Link>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700">Item name *</span>
              <input
                className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-stone-700">Category</span>
                <select
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white"
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
                <span className="mb-2 block text-sm font-medium text-stone-700">Quantity</span>
                <input
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white"
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700">Unit</span>
              <input
                className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-emerald-700 focus:bg-white"
                type="text"
                placeholder="e.g. pcs, kg, ml"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              />
            </label>

            <div className="rounded-2xl border border-stone-200 bg-[#f6f7f2] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-600">Barcode scanner</p>
              <p className="mt-2 text-sm text-stone-600">Use your camera to scan a barcode, or fill fields manually.</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                <video ref={videoRef} className="aspect-video w-full rounded-xl border border-stone-300 bg-black/80 object-cover" muted />
                <div className="flex flex-col gap-2">
                  {!isScanning ? (
                    <button
                      type="button"
                      className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700"
                      onClick={startScanning}
                    >
                      Scan barcode
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-full border border-stone-400 px-4 py-2 text-sm font-semibold text-stone-700"
                      onClick={stopScanning}
                    >
                      Stop scan
                    </button>
                  )}
                </div>
              </div>

              {scanValue ? (
                <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Scanned code: {scanValue}
                </p>
              ) : null}
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
            ) : null}

            <button
              className="w-full rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding item...' : 'Add item'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
