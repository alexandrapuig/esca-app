import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#eee4cf_0%,_#dce8d6_45%,_#f8f5ef_100%)] px-6 py-12 text-stone-900">
      <section className="grid w-full max-w-6xl gap-10 rounded-[2.5rem] border border-stone-200 bg-white p-8 shadow-[0_30px_90px_rgba(77,61,31,0.16)] lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
        <div className="flex flex-col justify-between gap-10">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-700">Esca</p>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
              Smart food waste reduction built around what is actually in your fridge.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              Track inventory, verify accounts with Supabase, predict spoilage risk, and turn expiring ingredients into useful meals before they become waste.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.75rem] bg-stone-100 p-5">
              <p className="text-sm text-stone-500">Auth</p>
              <p className="mt-3 text-2xl font-semibold">Supabase-first</p>
            </div>
            <div className="rounded-[1.75rem] bg-stone-100 p-5">
              <p className="text-sm text-stone-500">Insights</p>
              <p className="mt-3 text-2xl font-semibold">Spoilage signals</p>
            </div>
            <div className="rounded-[1.75rem] bg-stone-100 p-5">
              <p className="text-sm text-stone-500">Recipes</p>
              <p className="mt-3 text-2xl font-semibold">Waste-aware</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-stone-900 p-8 text-stone-100">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Get started</p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight">Authenticate, then enter the dashboard.</h2>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            This frontend is already wired to Supabase auth, callback handling, and protected dashboard routes.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-amber-200"
              href="/auth/signup"
            >
              Create account
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              href="/auth/login"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
