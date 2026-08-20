import Footer from '@/components/Footer';

const processors = [
  ['Supabase', 'Authentication and database hosting', 'Account details, profile data, inventory data', 'United States'],
  ['Anthropic Claude', 'AI-generated predictions and recipes', 'Relevant inventory and dietary preference data', 'United States'],
  ['Railway', 'Application backend hosting', 'Service request and operational data', 'United States'],
  ['Vercel', 'Web application hosting', 'Technical request data', 'United States'],
  ['SendGrid', 'Service emails', 'Email address and message delivery data', 'United States'],
  ['PostHog', 'Optional usage analytics', 'Pseudonymous usage events when enabled', 'United States'],
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-900">Legal</p>
        <h1 className="mt-3 font-serif text-4xl text-emerald-900 sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm font-light text-gray-600">Last updated: [DATE]</p>
        <div className="mt-12 space-y-10 font-light leading-relaxed text-gray-600">
          <section><h2 className="font-serif text-2xl text-emerald-900">What we collect</h2><p className="mt-3">We collect your email address, optional name, dietary restrictions, inventory items, and derived spoilage predictions and recipe suggestions. We also receive technical data needed to operate and secure the service. We collect analytics only when you opt in.</p></section>
          <section><h2 className="font-serif text-2xl text-emerald-900">How we use it</h2><p className="mt-3">We use data to authenticate you, provide and secure Esca, generate requested predictions and recipes, communicate about your account, and meet legal obligations. Where required, we process data under the legal bases applicable to providing a service, consent, legitimate interests, or legal compliance.</p></section>
          <section><h2 className="font-serif text-2xl text-emerald-900">Usage analytics</h2><p className="mt-3">If you opt in, PostHog receives pseudonymous events about how you use Esca, such as pages visited and feature interactions. Analytics are optional and can be changed through Cookie settings. We do not use analytics to make decisions with legal or similarly significant effects.</p></section>
          <section>
            <h2 className="font-serif text-2xl text-emerald-900">Processors</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full text-left text-sm"><thead className="bg-gray-50 font-medium text-gray-900"><tr><th className="px-4 py-3">Service</th><th className="px-4 py-3">Purpose</th><th className="px-4 py-3">Data shared</th><th className="px-4 py-3">Location</th></tr></thead><tbody>{processors.map(([service, purpose, data, location]) => <tr className="border-t border-gray-200" key={service}><td className="px-4 py-3 font-medium text-gray-900">{service}</td><td className="px-4 py-3">{purpose}</td><td className="px-4 py-3">{data}</td><td className="px-4 py-3">{location}</td></tr>)}</tbody></table>
            </div>
          </section>
          <section className="rounded-r-lg border-l-4 border-emerald-400 bg-emerald-50 p-6"><h2 className="font-serif text-2xl text-emerald-900">What we do not do</h2><p className="mt-3">We do not sell personal data, serve ads, share inventory with advertisers, track you across sites, or train third-party models with your personal data.</p></section>
          <section><h2 className="font-serif text-2xl text-emerald-900">Cookies</h2><p className="mt-3">We use strictly necessary cookies for authentication and your cookie preference. Optional analytics cookies are used only with your consent. See our Cookie Policy for details.</p></section>
          <section><h2 className="font-serif text-2xl text-emerald-900">Your rights</h2><p className="mt-3">Depending on your location, you may request access, correction, deletion, portability, restriction, objection, or withdrawal of consent. California residents may have rights to know, delete, correct, and limit certain uses of personal information. Contact noreply@escaone.com to exercise rights.</p></section>
          <section><h2 className="font-serif text-2xl text-emerald-900">Retention</h2><p className="mt-3">We retain account and inventory data while your account is active, then for [X MONTHS — CONFIRM] unless a longer period is needed for legal, security, or dispute-resolution purposes.</p></section>
          <section><h2 className="font-serif text-2xl text-emerald-900">Children</h2><p className="mt-3">Esca is not directed to children under [13 / 16 — CONFIRM WITH COUNSEL]. We do not knowingly collect personal information from children below that age.</p></section>
          <section><h2 className="font-serif text-2xl text-emerald-900">International transfers</h2><p className="mt-3">Our processors are located in the United States. When data is transferred internationally, we use [TRANSFER MECHANISM — CONFIRM WITH COUNSEL] and apply appropriate safeguards.</p></section>
          <section><h2 className="font-serif text-2xl text-emerald-900">Security</h2><p className="mt-3">We use reasonable technical and organizational measures designed to protect personal data. No system can guarantee absolute security.</p></section>
          <section><h2 className="font-serif text-2xl text-emerald-900">Changes</h2><p className="mt-3">We may update this policy and will post the revised version here with a new [DATE].</p></section>
          <section><h2 className="font-serif text-2xl text-emerald-900">Contact</h2><p className="mt-3">For privacy questions or requests, contact noreply@escaone.com. Our applicable privacy contact region is [CONFIRM REGION].</p></section>
        </div>
      </main>
      <Footer />
    </div>
  );
}