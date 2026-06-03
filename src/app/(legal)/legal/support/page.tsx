import type { Metadata } from "next";

export const metadata: Metadata = { title: "Support" };

const SUPPORT_EMAIL = "support@caseros.eu";

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Support</h1>
      <p className="mt-3 text-sm text-gray-500">
        Need a hand? We&apos;re happy to help.
      </p>

      <section className="mt-10 rounded-2xl border border-gray-200 p-8">
        <h2 className="text-lg font-semibold text-gray-900">Get in touch</h2>
        <p className="mt-2 text-sm leading-7 text-gray-600">
          For any question — order issues, account problems, seller queries, or general
          feedback — send us an email and we&apos;ll get back to you as soon as we can.
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-6 inline-block text-base font-semibold text-accent hover:text-accent-hover transition-colors"
        >
          {SUPPORT_EMAIL}
        </a>
      </section>

      <p className="mt-8 text-xs text-gray-400">
        Please include your order number (if applicable) so we can help you faster.
      </p>
    </main>
  );
}
