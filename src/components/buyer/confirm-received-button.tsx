"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Buyer confirms they received the order — completes it and releases the seller
// payout (the receipt handshake used when there's no carrier tracking).
export function ConfirmReceivedButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/buyer/orders/${orderId}/confirm-received`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      {error && <p className="mb-1 text-xs text-error">{error}</p>}
      <button
        onClick={confirm}
        disabled={loading}
        className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Confirming…" : "Confirm received"}
      </button>
    </div>
  );
}
