import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-bg-card">
      <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-text-muted">
          © {new Date().getFullYear()} Caseros. All rights reserved.
        </p>
        <div className="flex gap-5">
          <Link href="/legal/privacy" className="text-sm text-text-muted hover:text-text-secondary transition-colors">
            Privacy policy
          </Link>
          <Link href="/legal/terms" className="text-sm text-text-muted hover:text-text-secondary transition-colors">
            Terms of service
          </Link>
          <Link href="/legal/cookies" className="text-sm text-text-muted hover:text-text-secondary transition-colors">
            Cookie policy
          </Link>
          <Link href="/legal/pricing" className="text-sm text-text-muted hover:text-text-secondary transition-colors">
            Fees &amp; pricing
          </Link>
          <Link href="/legal/support" className="text-sm text-text-muted hover:text-text-secondary transition-colors">
            Support
          </Link>
        </div>
      </div>
    </footer>
  );
}
