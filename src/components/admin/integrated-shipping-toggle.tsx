"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck, Hand } from "lucide-react";

// Master switch between integrated (Shippo/Sendcloud rates, labels, tracking)
// and self-managed shipping (sellers arrange + cover delivery, no labels).
export function IntegratedShippingToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integratedShippingEnabled: !enabled }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Failed to update setting.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-start justify-between gap-6 rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3">
        {enabled ? (
          <Truck size={20} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : (
          <Hand size={20} className="mt-0.5 shrink-0 text-amber-500" />
        )}
        <div>
          <p className="font-medium text-gray-900">Integrated shipping</p>
          <p className="mt-0.5 text-sm text-gray-500">
            {enabled
              ? "Buyers pick carrier rates at checkout and sellers generate labels."
              : "Self-managed mode: sellers arrange and cover delivery, coordinating with buyers directly. No rates, labels, or tracking."}
          </p>
          {error && <p className="mt-1 text-xs text-error">{error}</p>}
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={[
          "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
          enabled
            ? "border border-error text-error hover:bg-error-subtle"
            : "bg-emerald-600 text-white hover:bg-emerald-700",
        ].join(" ")}
      >
        {loading && <Loader2 size={13} className="animate-spin" />}
        {enabled ? "Switch to self-managed" : "Enable integrated"}
      </button>
    </div>
  );
}
