"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [
  { label: "0%", value: 0 },
  { label: "2.5%", value: 2.5 },
  { label: "5%", value: 5 },
];

export function SetCommissionButton({ sellerId, current }: { sellerId: string; current: number }) {
  const router = useRouter();
  // current is stored as a decimal (e.g. 0.05 = 5%), convert to percentage
  const currentPct = Math.round(current * 1000) / 10;
  const [selected, setSelected] = useState(currentPct);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(pct: number) {
    if (pct === currentPct && saved) return;
    setSelected(pct);
    setSaved(false);
    setLoading(true);
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
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {PRESETS.map(({ label, value }) => {
          const active = selected === value;
          return (
            <button
              key={value}
              onClick={() => save(value)}
              disabled={loading}
              className={`px-3 py-1 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0 disabled:opacity-50 ${
                active
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {saved && <span className="text-xs text-green-600">Saved</span>}
    </div>
  );
}
