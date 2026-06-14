"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    document.cookie = `${CONSENT_KEY}=accepted; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    document.cookie = `${CONSENT_KEY}=declined; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-card px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-secondary">
          We use cookies to improve your experience and analyse site traffic. By continuing, you agree to our{" "}
          <Link href="/legal/cookies" className="underline underline-offset-2 hover:text-text-primary transition-colors">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={decline}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="rounded-lg bg-btn-neutral px-4 py-2 text-sm font-medium text-white hover:bg-btn-neutral-hover transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
