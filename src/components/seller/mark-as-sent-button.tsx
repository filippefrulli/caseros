"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

// Self-managed shipping: seller arranges delivery, coordinates with the buyer
// via Messages, then marks the order as sent. No carrier label/tracking.
export function MarkAsSentButton({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markSent() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seller/orders/${orderId}/mark-sent`, { method: "POST" });
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

  return (
    <div className="mt-3 space-y-2">
      {error && <p className="text-xs text-error">{error}</p>}

      {status === "SHIPPED" && (
        <p className="rounded-lg border border-border bg-bg-subtle px-3 py-2 text-xs text-text-secondary">
          Awaiting buyer confirmation of receipt.
        </p>
      )}

      <div className="flex gap-2">
        {status === "PROCESSING" && (
          <button
            onClick={markSent}
            disabled={loading}
            className="flex-1 rounded-lg bg-btn-neutral py-2.5 text-sm font-medium text-white hover:bg-btn-neutral-hover disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving…" : "Mark as sent"}
          </button>
        )}

        <Link
          href="/messages"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-strong py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors"
        >
          <MessageCircle size={15} />
          Message buyer
        </Link>
      </div>
    </div>
  );
}
