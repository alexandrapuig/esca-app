'use client';

import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';

import { addFridgeItem, identifyBarcode, type BarcodeIdentification } from '@/lib/api';

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

function captureVideoFrameBase64(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
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
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [identified, setIdentified] = useState<BarcodeIdentification | null>(null);
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
      const barcodeImage = captureVideoFrameBase64(videoRef.current);
      setScanValue(scannedCode);

      setIsIdentifying(true);
      const identification = await identifyBarcode({
        barcode: scannedCode,
        barcodeImage: barcodeImage ?? undefined,
      });

      if (!identification.success) {
        if (!name.trim()) {
          setName(`Item ${scannedCode.slice(-6)}`);
        }

        setCategory(mapBarcodeToCategory(scannedCode) as (typeof CATEGORIES)[number]);
        setErrorMessage(identification.error);
      } else {
        setIdentified(identification.data);

        if (!name.trim()) {
          setName(identification.data.name);
        }

        const identifiedCategory = CATEGORIES.includes(identification.data.category as (typeof CATEGORIES)[number])
          ? (identification.data.category as (typeof CATEGORIES)[number])
          : 'other';

        setCategory(identifiedCategory);
      }

      setIsIdentifying(false);
      setIsScanning(false);
      codeReader.reset();
    } catch (error) {
      if (error instanceof NotFoundException) {
        setErrorMessage('No barcode detected yet. Try again with better lighting.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Barcode scan failed');
      }

      setIsScanning(false);
      setIsIdentifying(false);
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
      typical_shelf_life_days: identified?.typical_shelf_life_days,
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
    <main className="min-h-screen bg-white px-6 py-10 text-gray-900 md:px-12 md:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <section className="rounded-2xl border border-gray-200 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Add item</p>
              <h1 className="mt-2 font-serif text-3xl leading-tight">Add to your fridge inventory</h1>
            </div>
            <Link
              href="/inventory"
              className="inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-gray-400"
            >
              Back to inventory
            </Link>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-3 block text-sm font-medium text-gray-900">Item Name *</span>
              <input
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                type="text"
                placeholder="e.g., Organic Carrots, Greek Yogurt"
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
                  placeholder="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>
            </div>

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

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm font-medium uppercase tracking-wide text-gray-600">Barcode scanner</p>
              <p className="mt-2 text-sm font-light text-gray-600">Use your camera to scan a barcode, or fill fields manually.</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                <video ref={videoRef} className="aspect-video w-full rounded-lg border border-gray-300 bg-black/80 object-cover" muted />
                <div className="flex flex-col gap-2">
                  {!isScanning ? (
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
                      onClick={startScanning}
                    >
                      Scan barcode
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg border border-gray-400 px-4 py-2 text-sm font-medium text-gray-700"
                      onClick={stopScanning}
                    >
                      Stop scan
                    </button>
                  )}
                </div>
              </div>

              {scanValue ? (
                <div className="mt-3 space-y-2">
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Scanned code: {scanValue}
                  </p>
                  {isIdentifying ? <p className="text-sm text-gray-600">Identifying product with AI...</p> : null}
                  {identified ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                      <p>
                        <span className="font-medium">Identified product:</span> {identified.name}
                      </p>
                      <p>
                        <span className="font-medium">Category:</span> {identified.category}
                      </p>
                      <p>
                        <span className="font-medium">Estimated shelf life:</span> {identified.typical_shelf_life_days} days
                      </p>
                      <p className="mt-1 text-xs text-amber-800">You can still edit any field before saving.</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
            ) : null}

            <button
              className="w-full rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding item...' : 'Add item'}
            </button>
          </form>

          <div className="mt-8 grid gap-4 border-t border-gray-200 pt-8 sm:grid-cols-3">
            <div>
              <p className="text-2xl">🧊</p>
              <p className="mt-2 text-sm font-medium text-gray-900">Keep It Cool</p>
              <p className="mt-1 text-xs font-light leading-snug text-gray-600">
                Store dairy and proteins in the coldest part of your fridge
              </p>
            </div>
            <div>
              <p className="text-2xl">💨</p>
              <p className="mt-2 text-sm font-medium text-gray-900">Good Ventilation</p>
              <p className="mt-1 text-xs font-light leading-snug text-gray-600">
                Vegetables last longer with proper air circulation
              </p>
            </div>
            <div>
              <p className="text-2xl">🎯</p>
              <p className="mt-2 text-sm font-medium text-gray-900">First In, First Out</p>
              <p className="mt-1 text-xs font-light leading-snug text-gray-600">
                Use older items before newer ones to minimize waste
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
