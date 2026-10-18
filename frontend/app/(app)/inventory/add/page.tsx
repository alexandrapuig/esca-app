'use client';

import Link from 'next/link';

export default function AddInventoryChooserPage() {
  return (
    <main className="min-h-screen bg-[#f6f1e8] px-6 py-10 text-gray-900 md:px-12 md:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Add to inventory</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight">What are you adding?</h1>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/inventory/add/single"
            className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-gray-400 hover:shadow-lg md:p-8"
          >
            <h2 className="font-serif text-2xl leading-snug text-gray-900">One item</h2>
            <p className="mt-3 text-sm font-light leading-relaxed text-gray-600">
              Type it in, scan its barcode, or photograph the package.
            </p>
            <span className="mt-6 text-sm font-medium text-emerald-800">Add one item</span>
          </Link>

          <Link
            href="/inventory/add/bulk"
            className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-gray-400 hover:shadow-lg md:p-8"
          >
            <h2 className="font-serif text-2xl leading-snug text-gray-900">A whole shop</h2>
            <p className="mt-3 text-sm font-light leading-relaxed text-gray-600">
              Upload a screenshot of your order or receipt and check the items before saving.
            </p>
            <span className="mt-6 text-sm font-medium text-emerald-800">Add several items</span>
          </Link>
        </div>

        <Link href="/inventory" className="text-sm font-medium text-gray-600 underline transition hover:text-gray-900">
          Back to inventory
        </Link>
      </div>
    </main>
  );
}
