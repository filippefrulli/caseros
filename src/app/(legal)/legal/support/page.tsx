import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ChevronDown } from "lucide-react";

export const metadata: Metadata = { title: "Support — Caseros" };

const SUPPORT_EMAIL = "filippe.frulli@caseros.eu";

const FAQS = [
  {
    q: "How do I track my order?",
    a: "Once your seller ships your order, you'll receive an email with a tracking number. You can also find it in your account under Orders.",
  },
  {
    q: "Can I return or exchange an item?",
    a: "Because every item is handmade to order, returns and exchanges are at the seller's discretion. Reach out to us within 14 days of delivery if something arrived damaged or not as described — we'll make it right.",
  },
  {
    q: "How long does shipping take?",
    a: "Delivery times vary by seller and destination. Most sellers ship within 3–5 business days. You'll see an estimated delivery window at checkout.",
  },
  {
    q: "How do I become a seller on Caseros?",
    a: "Open your shop from the seller onboarding page. We review every application manually to keep the marketplace quality high. You'll hear back from us within a few business days.",
  },
  {
    q: "When do sellers get paid?",
    a: "Payouts are released automatically once your buyer confirms delivery (or after a grace period if no action is taken). Funds are sent directly to your connected Stripe account.",
  },
  {
    q: "Is my payment information secure?",
    a: "Yes. All payments are processed by Stripe — we never store your card details. Caseros is PCI-compliant by design.",
  },
  {
    q: "I didn't receive a confirmation email. What should I do?",
    a: "Check your spam or junk folder first. If it's not there, email us with your order details and we'll sort it out.",
  },
  {
    q: "How do I delete my account?",
    a: "You can request account deletion from your account settings. We'll remove your personal data in line with our Privacy Policy.",
  },
];

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">How can we help?</h1>
        <p className="mt-3 text-base text-text-secondary leading-relaxed">
          Browse the common questions below, or reach out directly — we&apos;re a small team and we read every message.
        </p>
      </div>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="mb-6 text-lg font-semibold text-text-primary">Frequently asked questions</h2>
        <div className="divide-y divide-border rounded-2xl border border-border">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-text-primary">
                {q}
                <ChevronDown
                  size={16}
                  className="shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact card */}
      <section className="rounded-2xl border border-border bg-bg-card p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-subtle">
            <Mail size={18} className="text-text-secondary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Still need help?</h2>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              Send us an email and we&apos;ll get back to you as soon as we can — usually within one business day. Please include your order number if your question is about a specific purchase.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 inline-block text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
