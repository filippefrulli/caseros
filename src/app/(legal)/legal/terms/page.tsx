import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-text-primary">Terms of Service</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated: May 2025</p>

      <Section title="1. About these terms">
        <p>
          These Terms of Service ("Terms") govern your use of the Caseros marketplace. By
          creating an account or making a purchase, you agree to these Terms. If you do not
          agree, do not use the platform.
        </p>
        <p>
          Caseros is a marketplace platform, we facilitate transactions between buyers and
          sellers but are not a party to any sale. The contract of sale is between you (the
          buyer) and the individual seller.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 18 years old to use Caseros. By registering, you confirm that
          the information you provide is accurate and that you have the legal capacity to
          enter into contracts.
        </p>
      </Section>

      <Section title="3. Buyer terms">
        <Subsection title="Placing orders">
          <p>
            When you place an order, you enter into a binding purchase contract with the
            seller at the price displayed at checkout, including any applicable taxes and
            shipping fees. Caseros processes payment on the seller's behalf via Stripe.
          </p>
        </Subsection>
        <Subsection title="Returns and refunds">
          <p>
            Return and refund rights are governed by the seller's individual policy and by
            applicable consumer protection law. EU and EEA consumers have a statutory
            14-day right of withdrawal for physical goods purchased from professional sellers,
            unless an exception applies (e.g. personalised or perishable items). Contact the
            seller directly to initiate a return.
          </p>
        </Subsection>
        <Subsection title="Reviews">
          <p>
            You may leave a review only for orders you have completed. Reviews must be honest
            and based on your genuine experience. We reserve the right to remove reviews that
            are abusive, fraudulent, or otherwise in breach of these Terms.
          </p>
        </Subsection>
      </Section>

      <Section title="4. Seller terms">
        <Subsection title="Seller approval">
          <p>
            Opening a shop on Caseros requires approval. As part of the application process,
            you must complete identity verification (KYC). We may accept or reject
            applications at our discretion and may suspend or close shops that breach these Terms.
          </p>
        </Subsection>
        <Subsection title="Listings">
          <p>
            You are responsible for the accuracy of your listings, including descriptions,
            images, prices, and stock levels. Listings must represent goods that are designed and
            produced by you — by hand, with tools, or by machine — or under your direct supervision.
            Mass-produced, resold, or drop-shipped goods are not permitted.
          </p>
        </Subsection>
        <Subsection title="Platform commission">
          <p>
            Caseros charges a commission on each completed sale. The applicable rate is shown
            in your seller dashboard and is deducted before your payout is transferred via
            Stripe Connect. Commission rates may be updated with reasonable notice.
          </p>
        </Subsection>
        <Subsection title="Payouts">
          <p>
            Payouts are processed through Stripe Connect. You must complete Stripe's
            onboarding and comply with their terms to receive funds. Caseros is not
            responsible for delays caused by Stripe or your bank.
          </p>
        </Subsection>
        <Subsection title="Seller obligations">
          <p>
            You are responsible for fulfilling orders promptly, for the quality of your goods,
            for any applicable product safety obligations, and for declaring and paying any
            taxes owed on your sales.
          </p>
        </Subsection>
      </Section>

      <Section title="5. Prohibited conduct">
        <p>You may not use Caseros to:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Sell counterfeit, stolen, or infringing goods.</li>
          <li>List prohibited items including weapons, controlled substances, or illegal content.</li>
          <li>Circumvent platform payments or negotiate off-platform transactions.</li>
          <li>Harass, threaten, or abuse other users.</li>
          <li>Manipulate reviews or engage in fraudulent activity.</li>
          <li>Attempt to interfere with the security or operation of the platform.</li>
        </ul>
      </Section>

      <Section title="6. Intellectual property">
        <p>
          You retain ownership of content you upload (product photos, descriptions, shop
          branding). By uploading content, you grant Caseros a non-exclusive, worldwide,
          royalty-free licence to display and reproduce that content solely for the purpose
          of operating and promoting the marketplace.
        </p>
        <p>
          Caseros and its logo are trademarks of the platform operator. You may not use them
          without our prior written consent.
        </p>
      </Section>

      <Section title="7. Limitation of liability">
        <p>
          To the fullest extent permitted by applicable law, Caseros is not liable for any
          indirect, incidental, special, or consequential damages arising from your use of
          the platform. Our total liability for any claim arising from these Terms shall not
          exceed the greater of (a) the amount you paid to Caseros in the twelve months
          preceding the claim or (b) €100.
        </p>
        <p>
          Nothing in these Terms limits liability for death or personal injury caused by
          negligence, fraud, or any other liability that cannot be excluded by law.
        </p>
      </Section>

      <Section title="8. Governing law and disputes">
        <p>
          These Terms are governed by and construed in accordance with the laws of the
          European Union and, where applicable, the law of the country in which the platform
          operator is established. Any disputes shall first be referred to our support team
          for resolution. If unresolved, disputes may be submitted to the relevant courts of
          competent jurisdiction.
        </p>
        <p>
          EU consumers may also use the European Commission's Online Dispute Resolution
          platform.
        </p>
      </Section>

      <Section title="9. Changes to these terms">
        <p>
          We may update these Terms at any time. We will give reasonable notice of material
          changes by email or through the platform. Continued use after the effective date of
          updated Terms constitutes acceptance.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-text-secondary">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="font-medium text-text-primary">{title}</h3>
      <div className="mt-1 text-sm leading-7 text-text-secondary">{children}</div>
    </div>
  );
}
