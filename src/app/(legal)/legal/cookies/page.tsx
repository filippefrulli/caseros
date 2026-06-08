import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Cookie Policy</h1>
      <p className="mt-2 text-sm text-gray-400">Last updated: May 2025</p>

      <Section title="1. What are cookies">
        <p>
          Cookies are small text files placed on your device by a website you visit. They
          are widely used to make websites work, or work more efficiently, and to provide
          information to the site operator.
        </p>
      </Section>

      <Section title="2. The cookies we use">
        <p>
          Caseros uses only strictly necessary cookies. We do not use advertising cookies,
          third-party tracking cookies, or analytics cookies.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Cookie</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Provider</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Purpose</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 font-mono text-xs text-gray-800">sb-*-auth-token</td>
                <td className="px-4 py-3 text-gray-600">Supabase</td>
                <td className="px-4 py-3 text-gray-600">Stores your authentication session so you remain logged in between page loads.</td>
                <td className="px-4 py-3 text-gray-600">Session / up to 1 week</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4">
          These cookies are set by Supabase, our authentication provider, and are essential
          for the platform to function. Without them, you cannot log in or use any
          account-related features.
        </p>
      </Section>

      <Section title="3. Strictly necessary cookies and consent">
        <p>
          Under EU law (the ePrivacy Directive and GDPR), strictly necessary cookies do not
          require your prior consent because they are essential for a service you have
          explicitly requested. We therefore do not display a cookie consent banner for the
          cookies listed above.
        </p>
        <p>
          If we introduce any non-essential cookies in the future (for example, analytics or
          personalisation), we will update this policy and obtain your consent before setting
          them.
        </p>
      </Section>

      <Section title="4. How to control cookies">
        <p>
          You can control and delete cookies through your browser settings. The links below
          explain how to do this in common browsers:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="underline">
              Google Chrome
            </a>
          </li>
          <li>
            <a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="underline">
              Mozilla Firefox
            </a>
          </li>
          <li>
            <a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="underline">
              Safari
            </a>
          </li>
          <li>
            <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="underline">
              Microsoft Edge
            </a>
          </li>
        </ul>
        <p className="mt-3">
          Please note that deleting or blocking the authentication cookie will log you out
          and you will need to sign in again.
        </p>
      </Section>

      <Section title="5. Contact">
        <p>
          If you have questions about our use of cookies, contact us at{" "}
          <a href="mailto:filippe.frulli@caseros.eu" className="underline">filippe.frulli@caseros.eu</a>.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-gray-600">{children}</div>
    </section>
  );
}
