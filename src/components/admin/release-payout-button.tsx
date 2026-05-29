"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, DollarSign } from "lucide-react";

export function ReleasePayoutButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function release() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/orders/${orderId}/release`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Failed to release payout");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <button
        onClick={release}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <DollarSign size={13} />}
        Release payout
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
