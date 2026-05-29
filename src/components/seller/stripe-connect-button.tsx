"use client";

import { useState } from "react";

export function StripeConnectButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/stripe/connect", { method: "POST" });
      const { url, error } = (await res.json()) as { url?: string; error?: string };
      if (url) {
        window.location.assign(url);
      } else {
        console.error("Connect error:", error);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "Redirecting…" : "Connect payouts"}
    </button>
  );
}
