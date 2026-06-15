"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Seller cancels an order awaiting shipment (PROCESSING). Requires a reason and
// fully refunds the buyer. Only rendered for PROCESSING orders.
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!reason.trim()) {
      setError("Please give a reason for cancelling.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seller/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error, please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs font-medium text-error hover:underline"
      >
        Cancel order
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border bg-bg-subtle p-3">
      <p className="text-sm font-medium text-text-primary">Cancel this order?</p>
      <p className="text-xs text-text-secondary">
        The buyer will be refunded in full and the listing returns to your shop. This can&apos;t be undone.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Reason for cancelling (e.g. can't ship to the buyer's country)"
        className="block w-full rounded-lg border border-border-strong px-3 py-2 text-sm shadow-sm placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      {error && <p className="text-xs text-error">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={cancel}
          disabled={loading}
          className="flex-1 rounded-lg bg-error py-2.5 text-sm font-medium text-white hover:bg-error-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Cancelling…" : "Cancel & refund"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          disabled={loading}
          className="flex-1 rounded-lg border border-border-strong py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-card transition-colors"
        >
          Keep order
        </button>
      </div>
    </div>
  );
}
