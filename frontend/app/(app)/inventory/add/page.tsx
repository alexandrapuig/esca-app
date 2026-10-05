'use client';

import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';

import { addFridgeItem, identifyBarcode, identifyItemImage, type BarcodeIdentification, type ItemImageReading } from '@/lib/api';

const CATEGORIES = ['produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen', 'pantry', 'beverage', 'other'] as const;

// Must match SIZE_UNITS in backend/src/services/fridgeService.ts. 'fl oz' is
// volume and 'oz' is mass; they are not interchangeable.
const SIZE_UNITS = ['g', 'kg', 'ml', 'l', 'oz', 'lb', 'fl oz', 'other'] as const;

const SIZE_UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  'fl oz': 'fl oz', 'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz',
};

/**
 * Maps a free-text unit from Open Food Facts onto the fixed list. Returns an
 * empty string when it does not match, so the dropdown stays unset rather
 * than defaulting to 'other' on a spelling we simply have not listed.
 */
function normalizeSizeUnit(value: string): string {
  const raw = value.trim().toLowerCase();

  if (!raw) {
    return '';
  }

  return SIZE_UNIT_ALIASES[raw] ?? '';
}


/**
 * Draws a chosen file onto a canvas and re-exports it as JPEG, capped at
 * MAX_IMAGE_EDGE on its longest side.
 *
 * This does two jobs at once. A phone photo is several megabytes and base64
 * inflates it by a third, which overruns the serverless request body limit
 * before the backend ever sees it. And re-encoding settles the media type:
 * a PNG screenshot would otherwise be sent under a JPEG label.
 */
const MAX_IMAGE_EDGE = 1024;

function normalizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);

      if (!longestEdge) {
        reject(new Error('That file could not be read as an image.'));
        return;
      }

      const scale = longestEdge > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / longestEdge : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);

      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('That file could not be read as an image.'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl.replace(/^data:image\/jpeg;base64,/, ''));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('That file could not be read as an image.'));
    };

    image.src = objectUrl;
  });
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

type ReviewItem = ItemImageReading & {
  /** Stable key for editing a row; readings carry no id of their own. */
  rowId: string;
  include: boolean;
};

export default function AddInventoryItemPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('other');
  const [quantity, setQuantity] = useState('');
  const [size, setSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState('');
  const [brand, setBrand] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [estimatedExpiry, setEstimatedExpiry] = useState('');
  // Once the user types their own date, the computed value stops overwriting
  // it. Same rule as the other scan-filled fields.
  const [expiryEdited, setExpiryEdited] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [identified, setIdentified] = useState<BarcodeIdentification | null>(null);
  const [photoReading, setPhotoReading] = useState<ItemImageReading | null>(null);
  const [suggestedDate, setSuggestedDate] = useState('');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [readingSourceKind, setReadingSourceKind] = useState<'physical_item' | 'listing' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    };
  }, []);

  // Show the expiry the item will get, before saving rather than after. The
  // date is sent explicitly, so the backend stores what the user actually saw
  // instead of recomputing it.
  useEffect(() => {
    if (expiryEdited || !purchaseDate) {
      return;
    }

    const shelfLifeDays = identified?.typical_shelf_life_days;

    if (!shelfLifeDays) {
      return;
    }

    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(purchaseDate);

    if (!parts) {
      return;
    }

    const [, year, month, day] = parts;
    const computed = new Date(Number(year), Number(month) - 1, Number(day));
    computed.setDate(computed.getDate() + shelfLifeDays);

    setEstimatedExpiry(computed.toLocaleDateString('en-CA'));
  }, [purchaseDate, identified, expiryEdited]);


  function prefillFromReading(reading: ItemImageReading) {
    // Same rule as the barcode path: fill only what the user has left empty.
    // A photo should never overwrite something already typed.
    if (!name.trim() && reading.name) {
      setName(reading.name);
    }

    if (reading.category && CATEGORIES.includes(reading.category as (typeof CATEGORIES)[number])) {
      setCategory(reading.category as (typeof CATEGORIES)[number]);
    }

    if (!brand.trim() && reading.brand) {
      setBrand(reading.brand);
    }

    if (!quantity.trim() && reading.quantity !== null) {
      setQuantity(String(reading.quantity));
    }

    // Size and size_unit arrive together or not at all - the backend drops
    // one without the other, since an amount with no unit is meaningless.
    if (!size.trim() && reading.size !== null) {
      setSize(String(reading.size));
    }

    if (!sizeUnit && reading.size_unit) {
      setSizeUnit(reading.size_unit);
    }

    // The date is offered, never applied. A misread date silently drives
    // spoilage predictions and the expiry review modal, so it waits for a
    // deliberate tap even though every other field prefills.
    if (reading.printed_date) {
      setSuggestedDate(reading.printed_date);
    }
  }

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset immediately so picking the same file twice still fires onChange.
    event.target.value = '';

    if (!file) {
      return;
    }

    setErrorMessage('');
    setSuggestedDate('');
    setPhotoReading(null);
    setReviewItems([]);
    setIsIdentifying(true);

    try {
      const image = await normalizeImageFile(file);
      const identification = await identifyItemImage({ image, media_type: 'image/jpeg' });

      if (!identification.success) {
        setErrorMessage(identification.error);
        return;
      }

      const { source_kind: sourceKind, items } = identification.data;
      setReadingSourceKind(sourceKind);

      // One item fills the form directly; several open the review list, since
      // a form with one name field has nowhere to put four readings.
      if (items.length === 1 && items[0]) {
        setPhotoReading(items[0]);
        prefillFromReading(items[0]);
        return;
      }

      setReviewItems(items.map((item, index) => ({ ...item, rowId: `${Date.now()}-${index}`, include: true })));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'That photo could not be read.');
    } finally {
      setIsIdentifying(false);
    }
  }

  function updateReviewItem(rowId: string, changes: Partial<ReviewItem>) {
    setReviewItems((previous) =>
      previous.map((item) => (item.rowId === rowId ? { ...item, ...changes } : item)),
    );
  }

  function acceptSuggestedDate() {
    if (!suggestedDate) {
      return;
    }

    setEstimatedExpiry(suggestedDate);
    // Stops the shelf-life effect from overwriting a date the user accepted.
    setExpiryEdited(true);
    setSuggestedDate('');
  }

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
        // The barcode scanned fine, the product just is not in Open Food Facts
        // and could not be identified from the image. Leave name and category
        // untouched rather than inventing a placeholder or guessing a category
        // from the barcode digits - a wrong prefill is more work to correct
        // than an empty field is to fill.
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

        // Only fill fields the user has left empty - a scan should never
        // overwrite something already typed.
        if (!brand.trim() && identification.data.brand) {
          setBrand(identification.data.brand);
        }

        // Open Food Facts gives quantity as one string: "454 g", "500 ml".
        // Split the leading number from the unit; if it does not parse, leave
        // both fields alone rather than guessing.
        if (identification.data.quantity_text) {
          const match = /^([\d.,]+)\s*(.*)$/.exec(identification.data.quantity_text.trim());

          if (match) {
            const parsedSize = match[1].replace(',', '.');
            const parsedUnit = normalizeSizeUnit(match[2]);

            // "454 g" describes one package, so it fills Size, not Quantity.
            if (!size.trim() && parsedSize) {
              setSize(parsedSize);
            }

            if (!sizeUnit && parsedUnit) {
              setSizeUnit(parsedUnit);
            }
          }
        }
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

  /**
   * Inserts every ticked row by calling the existing create endpoint once per
   * item. Sequential rather than parallel: a cart screenshot is a handful of
   * rows, and a failure part-way through should leave a clear record of what
   * landed rather than an unordered scatter.
   *
   * Partial success is kept rather than rolled back - the items that were
   * added are real, and the user can retry the rest.
   */
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Name is required');
      return;
    }

    let parsedPrice: number | undefined;

    if (purchasePrice.trim()) {
      const value = Number(purchasePrice);

      if (Number.isNaN(value) || value < 0) {
        setErrorMessage('Purchase price must be a positive number');
        return;
      }

      parsedPrice = value;
    }

    setIsSubmitting(true);

    const parsedQuantity = quantity.trim() ? Number(quantity) : undefined;

    if (parsedQuantity !== undefined && Number.isNaN(parsedQuantity)) {
      setErrorMessage('Quantity must be a number');
      setIsSubmitting(false);
      return;
    }

    const parsedSize = size.trim() ? Number(size) : undefined;

    if (parsedSize !== undefined && Number.isNaN(parsedSize)) {
      setErrorMessage('Size must be a number');
      setIsSubmitting(false);
      return;
    }

    const result = await addFridgeItem({
      name,
      category,
      quantity: parsedQuantity,
      size: parsedSize,
      size_unit: sizeUnit || undefined,
      typical_shelf_life_days: identified?.typical_shelf_life_days,
      brand: brand.trim() || undefined,
      purchase_location: purchaseLocation.trim() || undefined,
      purchase_price: parsedPrice,
      notes: notes.trim() || undefined,
      purchase_date: purchaseDate || undefined,
      estimated_expiry: estimatedExpiry || undefined,
      // Sent so the backend can learn this barcode from what the user typed.
      // scanValue is only set by a successful scan, so manual entries send
      // nothing and nothing is learned from them.
      barcode: scanValue || undefined,
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
    <main className="min-h-screen bg-[#f6f1e8] px-6 py-10 text-gray-900 md:px-12 md:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Add item</p>
              <h1 className="mt-2 font-serif text-3xl leading-tight">Add to your fridge inventory</h1>
            </div>
            <Link
              href="/inventory"
              className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-gray-400"
            >
              Back to inventory
            </Link>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-3 block text-sm font-medium text-gray-900">Item Name *</span>
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                <span className="mb-3 block text-sm font-medium text-gray-900">
                  Quantity <span className="font-normal text-gray-500">(how many)</span>
                </span>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="text"
                  inputMode="decimal"
                  placeholder="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">
                  Size <span className="font-normal text-gray-500">(each)</span>
                </span>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  type="text"
                  inputMode="decimal"
                  placeholder="500"
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-3 block text-sm font-medium text-gray-900">Size unit</span>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  value={sizeUnit}
                  onChange={(event) => setSizeUnit(event.target.value)}
                >
                  <option value="">Not specified</option>
                  {SIZE_UNITS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'other' ? 'Other' : option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowMoreDetails((prev) => !prev)}
                className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
              >
                {showMoreDetails ? 'Hide extra details' : 'Add more details'}
              </button>

              {showMoreDetails ? (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-3 block text-sm font-medium text-gray-900">Brand</span>
                      <input className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600" type="text" placeholder="e.g. Chobani" value={brand} onChange={(event) => setBrand(event.target.value)} />
                    </label>

                    <label className="block">
                      <span className="mb-3 block text-sm font-medium text-gray-900">Purchase date</span>
                      <input className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
                    </label>

                    <label className="block">
                      <span className="mb-3 block text-sm font-medium text-gray-900">Estimated expiry</span>
                      <input className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600" type="date" value={estimatedExpiry} onChange={(event) => { setEstimatedExpiry(event.target.value); setExpiryEdited(true); }} />
                    </label>

                    <label className="block">
                      <span className="mb-3 block text-sm font-medium text-gray-900">Purchased from</span>
                      <input className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600" type="text" placeholder="e.g. Trader Joe's" value={purchaseLocation} onChange={(event) => setPurchaseLocation(event.target.value)} />
                    </label>

                    <label className="block">
                      <span className="mb-3 block text-sm font-medium text-gray-900">Price paid</span>
                      <input className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600" type="text" inputMode="decimal" placeholder="4.99" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-3 block text-sm font-medium text-gray-900">Notes</span>
                    <textarea className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600" rows={3} placeholder="Anything worth remembering about this item" value={notes} onChange={(event) => setNotes(event.target.value)} />
                  </label>
                </div>
              ) : null}
            </div>

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
                        <span className="font-medium">Category:</span> <span className="capitalize">{identified.category}</span>
                      </p>
                      <p>
                        <span className="font-medium">Estimated shelf life:</span> {identified.typical_shelf_life_days} days
                      </p>
                      <p className="mt-1 text-xs text-amber-800">You can still edit any field before saving.</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 border-t border-gray-200 pt-5">
                <p className="text-sm font-medium uppercase tracking-wide text-gray-600">Identify from a photo</p>
                <p className="mt-2 text-sm font-light text-gray-600">
                  No barcode, or a loose item? Photograph the label or upload a screenshot and Esca will read what it can.
                </p>

                <label className="mt-4 inline-flex cursor-pointer items-center rounded-lg border border-emerald-900 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoSelected}
                    disabled={isIdentifying}
                  />
                  {isIdentifying ? 'Reading photo...' : 'Take or upload a photo'}
                </label>

                {photoReading ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                    <p className="font-medium">Read from your photo</p>
                    <p className="mt-1">Name: {photoReading.name ?? 'not legible'}</p>
                    <p>Category: <span className="capitalize">{photoReading.category ?? 'not legible'}</span></p>
                    <p>
                      Size:{' '}
                      {photoReading.size !== null && photoReading.size_unit
                        ? `${photoReading.size} ${photoReading.size_unit}`
                        : 'not legible'}
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      Anything not legible was left for you to fill in. You can edit every field before saving.
                    </p>
                  </div>
                ) : null}

                {suggestedDate ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                    <p>
                      A date reading <span className="font-medium">{suggestedDate}</span> was found on the label
                      {photoReading?.printed_date_kind
                        ? ` (${photoReading.printed_date_kind.replace('_', ' ')})`
                        : ''}
                      .
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={acceptSuggestedDate}
                        className="rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-800"
                      >
                        Use this expiry date
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestedDate('')}
                        className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100"
                      >
                        Ignore
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-emerald-800">
                      Check it against the package before using it - a misread date affects spoilage alerts.
                    </p>
                  </div>
                ) : null}

                {reviewItems.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-gray-300 bg-white p-4">
                    <p className="text-sm font-medium text-gray-900">
                      {reviewItems.length} items read from that image
                    </p>
                    <p className="mt-1 text-xs font-light text-gray-600">
                      Check each one before adding. Untick anything you do not want, and edit anything that came back
                      wrong.
                      {readingSourceKind === 'listing'
                        ? ' No expiry dates were taken: a screenshot shows a picture of a product, not the one in your fridge.'
                        : ''}
                    </p>

                    <div className="mt-4 space-y-3">
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

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleAddReviewed}
                        disabled={isSubmitting || reviewItems.every((item) => !item.include)}
                        className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        {isSubmitting
                          ? 'Adding...'
                          : `Add ${reviewItems.filter((item) => item.include).length} items`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewItems([])}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
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
