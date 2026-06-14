import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-text-primary">Privacy Policy</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated: May 2025</p>

      <Section title="1. Who we are">
        <p>
          Caseros is an online marketplace connecting buyers with independent European artisans
          selling handmade and craft goods. References to "Caseros", "we", "us", or "our" in
          this policy refer to the operator of this platform. If you have questions about this
          policy, contact us at <a href="mailto:filippe.frulli@caseros.eu" className="underline">filippe.frulli@caseros.eu</a>.
        </p>
      </Section>

      <Section title="2. Data we collect">
        <p>We collect and process the following categories of personal data:</p>

        <Subsection title="Account data">
          <p>
            When you register, we collect your email address and, optionally, your name and
            profile picture. We link your account to a Supabase authentication identifier.
          </p>
        </Subsection>

        <Subsection title="Buyer data">
          <p>
            If you make a purchase, we collect shipping addresses (street address, city, postal
            code, country) and retain a record of your orders, including the items purchased,
            prices paid, and order status. Payment card data is processed exclusively by Stripe
            and is never stored on our servers.
          </p>
        </Subsection>

        <Subsection title="Seller data">
          <p>
            If you open a shop, we collect your shop name, bio, avatar and banner images,
            country, preferred currency, and optional social media links. We also process
            Know Your Customer (KYC) information, which may include your full name, date of
            birth, address, and, for registered traders, a business registration number and
            contact details. A verification video may be requested and stored during the
            approval process.
          </p>
        </Subsection>

        <Subsection title="Communications">
          <p>
            Messages exchanged between buyers and sellers through the platform are stored in
            our database, including read receipts, so that both parties can access their
            conversation history.
          </p>
        </Subsection>

        <Subsection title="Usage data">
          <p>
            We record which listings you have saved as favourites and, if you leave a review,
            the content and rating of that review.
          </p>
        </Subsection>

        <Subsection title="Technical data">
          <p>
            Like most web services, our hosting infrastructure may log IP addresses, browser
            type, and request timestamps as part of normal server operation. We do not use
            third-party analytics or advertising trackers.
          </p>
        </Subsection>
      </Section>

      <Section title="3. How we use your data">
        <p>We use your personal data to:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Create and manage your account and authenticate your identity.</li>
          <li>Process orders, calculate taxes, and facilitate payment through Stripe.</li>
          <li>Transfer seller payouts via Stripe Connect.</li>
          <li>Deliver buyer–seller messages and platform notifications.</li>
          <li>Verify seller identities and approve shop applications (KYC).</li>
          <li>Maintain records required by applicable tax and commercial law.</li>
          <li>Detect and prevent fraud or abuse of the platform.</li>
          <li>Respond to support requests.</li>
        </ul>
        <p className="mt-3">
          We process your data on the legal bases of contract performance (to fulfil your
          orders or seller agreement), legal obligation (tax and KYC requirements), and
          legitimate interest (platform security and fraud prevention). Where required, we
          will ask for your explicit consent.
        </p>
      </Section>

      <Section title="4. Third parties we share data with">
        <p>We share personal data only with the following third parties and only to the extent necessary:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            <strong>Supabase</strong> - provides our authentication service and cloud database
            hosting. Your data is stored on Supabase's infrastructure, subject to their data
            processing agreement.
          </li>
          <li>
            <strong>Stripe</strong> - processes all payments and seller payouts. When you pay
            for an order or a seller connects a bank account, you interact directly with
            Stripe's systems under their privacy policy.
          </li>
        </ul>
        <p className="mt-3">
          We do not sell your personal data to any third party, and we do not use your data
          for advertising purposes.
        </p>
      </Section>

      <Section title="5. Data retention">
        <p>
          We retain your account data for as long as your account is active. Order records
          are retained for seven years to meet accounting and tax obligations. KYC records
          are retained as required by applicable anti-money-laundering regulations.
        </p>
        <p className="mt-3">
          You may request deletion of your account at any time (see section 6). Where we are
          required by law to retain certain records, we will retain only the minimum necessary
          data for the legally required period.
        </p>
      </Section>

      <Section title="6. Your rights (GDPR)">
        <p>If you are located in the European Economic Area, you have the right to:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>Access</strong> - request a copy of the personal data we hold about you.</li>
          <li><strong>Rectification</strong> - ask us to correct inaccurate data.</li>
          <li><strong>Erasure</strong> - request deletion of your data, subject to legal retention obligations.</li>
          <li><strong>Portability</strong> - receive your data in a structured, machine-readable format.</li>
          <li><strong>Restriction</strong> - ask us to limit processing of your data in certain circumstances.</li>
          <li><strong>Objection</strong> - object to processing based on legitimate interests.</li>
          <li><strong>Withdraw consent</strong> - where processing is based on consent, withdraw it at any time.</li>
        </ul>
        <p className="mt-3">
          To exercise any of these rights, email us at{" "}
          <a href="mailto:filippe.frulli@caseros.eu" className="underline">filippe.frulli@caseros.eu</a>. We will
          respond within 30 days. You also have the right to lodge a complaint with your local
          data protection authority.
        </p>
      </Section>

      <Section title="7. Cookies">
        <p>
          We use cookies solely for authentication and session management. See our{" "}
          <a href="/legal/cookies" className="underline">Cookie Policy</a> for details.
        </p>
      </Section>

      <Section title="8. Changes to this policy">
        <p>
          We may update this policy from time to time. If changes are material, we will
          notify you by email or by displaying a notice in the platform. Continued use of
          Caseros after an update constitutes acceptance of the revised policy.
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
