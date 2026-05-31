import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} Caseros. All rights reserved.
        </p>
        <div className="flex gap-5">
          <Link href="/legal/privacy" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Privacy policy
          </Link>
          <Link href="/legal/terms" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Terms of service
          </Link>
          <Link href="/legal/cookies" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Cookie policy
          </Link>
          <Link href="/legal/pricing" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Fees &amp; pricing
          </Link>
        </div>
      </div>
    </footer>
  );
}
