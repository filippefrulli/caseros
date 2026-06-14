import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Fees & Pricing" };

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-6 text-sm text-text-secondary">{label}</td>
      <td className="py-3 pr-6 text-sm font-semibold text-text-primary">{value}</td>
      <td className="py-3 text-sm text-text-muted">{note}</td>
    </tr>
  );
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-text-primary">Fees &amp; Pricing</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated: May 2026</p>

      <p className="mt-6 text-text-secondary">
        Caseros keeps fees simple and transparent. There are no monthly subscriptions, no
        listing fees, and no surprises at payout time.
      </p>

      {/* Seller fees */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">Seller fees</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Fees are deducted automatically from each sale before the payout is sent to your
          connected Stripe account.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead className="border-b border-border bg-bg-subtle">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">Fee</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">Rate</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">Notes</th>
              </tr>
            </thead>
            <tbody className="px-5">
              <tr className="border-b border-border">
                <td className="px-5 py-3 text-sm text-text-secondary">Listing fee</td>
                <td className="px-5 py-3 text-sm font-semibold text-green-700">Free</td>
                <td className="px-5 py-3 text-sm text-text-muted">No charge to list items</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-5 py-3 text-sm text-text-secondary">Platform commission</td>
                <td className="px-5 py-3 text-sm font-semibold text-text-primary">5%</td>
                <td className="px-5 py-3 text-sm text-text-muted">Applied to the item subtotal, excluding shipping</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm text-text-secondary">Payment processing</td>
                <td className="px-5 py-3 text-sm font-semibold text-text-primary">Stripe rates</td>
                <td className="px-5 py-3 text-sm text-text-muted">Charged by Stripe; varies by card type and country</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-bg-subtle px-5 py-4">
          <p className="text-sm font-medium text-text-primary">Example payout</p>
          <p className="mt-1 text-sm text-text-secondary">
            You sell an item for <strong>€100</strong>. Caseros deducts a 5% commission
            (€5.00). Stripe deducts their processing fee (typically ~€3.25 for a European
            card). You receive approximately <strong>€91.75</strong>.
          </p>
        </div>
      </section>

      {/* Buyer fees */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">Buyer fees</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Buyers pay no platform fee. The price shown on a listing is what you pay for the
          item. Shipping costs, if applicable, are calculated at checkout based on your
          delivery address and the carrier rates.
        </p>
      </section>

      {/* Shipping */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">Shipping costs</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Shipping fees are set by the carrier (e.g. PostNL, DPD, DHL) based on the
          parcel's weight, dimensions, and destination. Rates are shown to you before
          payment. Caseros does not mark up shipping costs.
        </p>
      </section>

      {/* Fee changes */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">Changes to fees</h2>
        <p className="mt-1 text-sm text-text-secondary">
          In accordance with{" "}
          <abbr title="EU Regulation 2019/1150 on promoting fairness and transparency for business users of online intermediation services">
            EU Regulation 2019/1150
          </abbr>
          , Caseros will notify active sellers at least <strong>15 days</strong> before
          any change to the fee structure. Sellers may terminate their account at any
          time before the change takes effect.
        </p>
      </section>

      {/* Waived fees note */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">Early seller programme</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Sellers who joined Caseros during our early launch phase may have a reduced or
          zero platform commission applied to their account. If you were part of this
          programme, your personalised rate is shown in your seller dashboard.
        </p>
      </section>

      <div className="mt-12 border-t border-border pt-8 text-sm text-text-muted">
        Questions? Contact us at{" "}
        <a href="mailto:filippe.frulli@caseros.eu" className="underline hover:text-text-secondary">
          filippe.frulli@caseros.eu
        </a>{" "}
        or read our{" "}
        <Link href="/legal/terms" className="underline hover:text-text-secondary">
          Terms of Service
        </Link>
        .
      </div>
    </main>
  );
}
