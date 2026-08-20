import Footer from '@/components/Footer';

const sections = [
  ['acceptance-and-minimum-age', 'Acceptance and minimum age', 'By creating an account or using Esca, you agree to these Terms of Service. You must be at least [13 / 16 — CONFIRM WITH COUNSEL] years old, or the age of digital consent where you live, to use the service.'],
  ['description-of-service', 'Description of service', 'Esca helps you record food inventory, receive estimated spoilage predictions, and discover recipe ideas. Features may change as we improve the service.'],
  ['accounts', 'Accounts', 'You are responsible for providing accurate account information, safeguarding your credentials, and promptly telling us about suspected unauthorized access.'],
  ['ai-generated-content-and-food-safety', 'AI-generated content and food safety', ''],
  ['acceptable-use', 'Acceptable use', 'Do not misuse Esca, interfere with its operation, attempt unauthorized access, upload unlawful material, or use the service to harm others.'],
  ['user-content', 'User content', 'You retain ownership of the inventory information and other content you submit. You grant us a limited right to process it solely to operate, secure, and improve Esca for you.'],
  ['beta-software-notice', 'Beta software notice', 'Esca may include beta or experimental features. They may change, be unavailable, or contain errors, and are provided without commitments about availability or performance.'],
  ['termination', 'Termination', 'You may stop using Esca at any time. We may suspend or terminate access where reasonably necessary to protect users, the service, or our legal obligations.'],
  ['disclaimers-and-liability', 'Disclaimers and liability', 'To the maximum extent permitted by law, Esca is provided as is and as available. Our total liability for claims related to the service is limited to [AMOUNT — CONFIRM WITH COUNSEL].'],
  ['changes', 'Changes', 'We may update these terms. Material changes will be posted here with a revised [DATE]. Continued use after the effective date means you accept the updated terms.'],
  ['governing-law', 'Governing law', 'These terms are governed by the laws of [JURISDICTION — CONFIRM WITH COUNSEL], without regard to conflict-of-law principles.'],
  ['contact', 'Contact', 'Questions about these terms can be sent to noreply@escaone.com.'],
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-900">Legal</p>
        <h1 className="mt-3 font-serif text-4xl text-emerald-900 sm:text-5xl">Terms of Service</h1>
        <p className="mt-4 text-sm font-light text-gray-600">Last updated: [DATE]</p>
        <section className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
          <h2 className="font-serif text-2xl text-emerald-900">In plain English</h2>
          <p className="mt-3 font-light leading-relaxed text-gray-600">Esca helps you make informed decisions about food in your home, but it cannot replace your judgment, food labels, or food-safety guidance. Use the service responsibly and do not rely on it for guarantees.</p>
        </section>
        <div className="mt-12 space-y-10">
          {sections.map(([id, title, content], index) => (
            <section id={id} key={id} className="scroll-mt-8">
              <h2 className="font-serif text-2xl text-emerald-900">{index + 1}. {title}</h2>
              {id === 'ai-generated-content-and-food-safety' ? (
                <div className="mt-4 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 p-6 text-gray-700">
                  <p className="font-medium">Spoilage predictions and recipes are AI-generated estimates, not food safety guarantees.</p>
                  <p className="mt-3 font-light leading-relaxed">Esca cannot see, smell, or test food and does not know how it was stored. Manufacturer use-by dates take precedence over anything shown in Esca. Recipes may not catch all allergens or dietary risks. When in doubt, throw it out.</p>
                </div>
              ) : (
                <p className="mt-3 font-light leading-relaxed text-gray-600">{content}</p>
              )}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}