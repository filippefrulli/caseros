"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";

export function RefundButton({ orderId, totalAmount }: { orderId: string; totalAmount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Refund failed");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-error px-3 py-1.5 text-sm font-medium text-error hover:bg-error-subtle transition-colors"
      >
        <RotateCcw size={13} />
        Refund order
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-700">
        This will issue a full refund of the order total to the buyer&apos;s card.
        {" "}Any released payouts will be reversed from the seller&apos;s Stripe account first.
      </p>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-error px-3 py-1.5 text-sm font-medium text-white hover:bg-error-hover disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : null}
          Confirm full refund
        </button>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          disabled={loading}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
