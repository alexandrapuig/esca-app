import Link from 'next/link';

import Footer from '@/components/Footer';

const features = [
  {
    title: 'Track what you have',
    description: 'Scan a barcode or add an item manually. Keep your fridge and pantry separate, so your inventory reflects the way your kitchen actually works.',
    image: 'https://images.unsplash.com/photo-1584473457409-ae5c91d7d8b1?w=800&h=600&fit=crop',
    alt: 'Fresh vegetables and ingredients arranged in a well-stocked kitchen',
    imageFirst: true,
  },
  {
    title: 'Know what needs eating',
    description: 'Every item is scored by spoilage risk with a plain-language explanation. Food nearing expiry rises to the top, so the next decision is easier to make.',
    image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=800&h=600&fit=crop',
    alt: 'Organized refrigerator shelves with fresh food and produce',
    imageFirst: false,
  },
  {
    title: "Cook from what's already there",
    description: 'Recipes are built around the ingredients closest to expiring, while respecting the dietary preferences you have chosen for your household.',
    image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=600&fit=crop',
    alt: 'A prepared meal surrounded by fresh ingredients on a kitchen counter',
    imageFirst: true,
  },
];

export default function Home() {
  return (
    <div className="bg-white text-gray-900">
      <nav className="border-b border-gray-200 px-6" aria-label="Primary navigation">
        <div className="mx-auto flex max-w-7xl items-center justify-between py-5">
          <Link className="font-serif text-2xl text-emerald-900" href="/">Esca</Link>
          <div className="flex items-center gap-5 text-sm">
            <Link className="font-light text-gray-600 transition hover:text-emerald-900" href="/auth/login">Sign in</Link>
            <Link className="rounded-lg bg-emerald-900 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-800" href="/auth/signup">Get started</Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-20 lg:py-20">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-600">Intelligent food management</p>
            <h1 className="mt-5 max-w-2xl font-serif text-5xl leading-tight text-emerald-900 lg:text-6xl">Waste less. Cook more.</h1>
            <p className="mt-6 max-w-xl text-lg font-light leading-relaxed text-gray-600">About a third of household food is thrown away. Esca tracks what you have and tells you what needs eating first, so less of your food gets forgotten.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800" href="/auth/signup">Get started</Link>
              <Link className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:border-emerald-900 hover:text-emerald-900" href="/auth/login">Sign in</Link>
            </div>
            <p className="mt-8 max-w-xl text-sm font-light leading-relaxed text-gray-500">Esca is in beta. Spoilage predictions are AI-generated estimates, not food safety guarantees.</p>
          </div>
          <div className="hidden aspect-[5/6] overflow-hidden rounded-2xl lg:block">
            <img className="h-full w-full object-cover" src="https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1000&h=1200&fit=crop" alt="A calm kitchen with fresh food prepared on a wooden counter" />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="space-y-20 lg:space-y-28">
            {features.map((feature) => (
              <article className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20" key={feature.title}>
                <div className={feature.imageFirst ? 'lg:order-1' : 'lg:order-2'}>
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                    <img className="h-full w-full object-cover" src={feature.image} alt={feature.alt} />
                  </div>
                </div>
                <div className={feature.imageFirst ? 'lg:order-2' : 'lg:order-1'}>
                  <h2 className="font-serif text-3xl leading-tight text-emerald-900 lg:text-4xl">{feature.title}</h2>
                  <p className="mt-5 max-w-xl text-lg font-light leading-relaxed text-gray-600">{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-gray-50 px-6 py-20">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="font-serif text-3xl leading-tight text-emerald-900 lg:text-4xl">Start with what's in your fridge</h2>
            <p className="mt-4 font-light leading-relaxed text-gray-600">A clearer view of your food starts with one item.</p>
            <Link className="mt-7 inline-flex rounded-lg bg-emerald-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800" href="/auth/signup">Get started</Link>
            <p className="mx-auto mt-8 max-w-xl text-sm font-light leading-relaxed text-gray-500">Esca is in beta. Spoilage predictions are AI-generated estimates, not food safety guarantees.</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
