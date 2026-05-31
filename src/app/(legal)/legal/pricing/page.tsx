import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Fees & Pricing" };

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-6 text-sm text-gray-700">{label}</td>
      <td className="py-3 pr-6 text-sm font-semibold text-gray-900">{value}</td>
      <td className="py-3 text-sm text-gray-400">{note}</td>
    </tr>
  );
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Fees &amp; Pricing</h1>
      <p className="mt-2 text-sm text-gray-400">Last updated: May 2026</p>

      <p className="mt-6 text-gray-600">
        Caseros keeps fees simple and transparent. There are no monthly subscriptions, no
        listing fees, and no surprises at payout time.
      </p>

      {/* Seller fees */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Seller fees</h2>
        <p className="mt-1 text-sm text-gray-500">
          Fees are deducted automatically from each sale before the payout is sent to your
          connected Stripe account.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Fee</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Rate</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Notes</th>
              </tr>
            </thead>
            <tbody className="px-5">
              <tr className="border-b border-gray-100">
                <td className="px-5 py-3 text-sm text-gray-700">Listing fee</td>
                <td className="px-5 py-3 text-sm font-semibold text-green-700">Free</td>
                <td className="px-5 py-3 text-sm text-gray-400">No charge to list items</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-5 py-3 text-sm text-gray-700">Platform commission</td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-900">5%</td>
                <td className="px-5 py-3 text-sm text-gray-400">Applied to the item subtotal, excluding shipping</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm text-gray-700">Payment processing</td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-900">Stripe rates</td>
                <td className="px-5 py-3 text-sm text-gray-400">Charged by Stripe; varies by card type and country</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
          <p className="text-sm font-medium text-gray-900">Example payout</p>
          <p className="mt-1 text-sm text-gray-500">
            You sell an item for <strong>€100</strong>. Caseros deducts a 5% commission
            (€5.00). Stripe deducts their processing fee (typically ~€3.25 for a European
            card). You receive approximately <strong>€91.75</strong>.
          </p>
        </div>
      </section>

      {/* Buyer fees */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Buyer fees</h2>
        <p className="mt-1 text-sm text-gray-500">
          Buyers pay no platform fee. The price shown on a listing is what you pay for the
          item. Shipping costs, if applicable, are calculated at checkout based on your
          delivery address and the carrier rates.
        </p>
      </section>

      {/* Shipping */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Shipping costs</h2>
        <p className="mt-1 text-sm text-gray-500">
          Shipping fees are set by the carrier (e.g. PostNL, DPD, DHL) based on the
          parcel's weight, dimensions, and destination. Rates are shown to you before
          payment. Caseros does not mark up shipping costs.
        </p>
      </section>

      {/* Fee changes */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Changes to fees</h2>
        <p className="mt-1 text-sm text-gray-500">
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
        <h2 className="text-lg font-semibold text-gray-900">Early seller programme</h2>
        <p className="mt-1 text-sm text-gray-500">
          Sellers who joined Caseros during our early launch phase may have a reduced or
          zero platform commission applied to their account. If you were part of this
          programme, your personalised rate is shown in your seller dashboard.
        </p>
      </section>

      <div className="mt-12 border-t border-gray-100 pt-8 text-sm text-gray-400">
        Questions? Contact us at{" "}
        <a href="mailto:hello@caseros.eu" className="underline hover:text-gray-700">
          hello@caseros.eu
        </a>{" "}
        or read our{" "}
        <Link href="/legal/terms" className="underline hover:text-gray-700">
          Terms of Service
        </Link>
        .
      </div>
    </main>
  );
}
