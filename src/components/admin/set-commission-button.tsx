"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SetCommissionButton({ sellerId, current }: { sellerId: string; current: number }) {
  const router = useRouter();
  const [rate, setRate] = useState(String(Math.round(current * 100)));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    const pct = parseFloat(rate);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    setLoading(true);
    setSaved(false);
    await fetch(`/api/admin/sellers/${sellerId}/commission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionRate: pct / 100 }),
    });
    setLoading(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={rate}
          onChange={e => { setRate(e.target.value); setSaved(false); }}
          className="w-16 px-2 py-1 text-sm text-right focus:outline-none"
        />
        <span className="pr-2 text-sm text-gray-400">%</span>
      </div>
      <button
        onClick={save}
        disabled={loading}
        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900 disabled:opacity-50 transition-colors"
      >
        {loading ? "Saving…" : "Set"}
      </button>
      {saved && <span className="text-xs text-green-600">Saved</span>}
    </div>
  );
}
