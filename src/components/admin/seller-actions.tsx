"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function SellerActions({ sellerId }: { sellerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "deny" | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [showDenyForm, setShowDenyForm] = useState(false);

  async function approve() {
    setLoading("approve");
    await fetch(`/api/admin/sellers/${sellerId}/approve`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }

  async function deny() {
    if (!denyReason.trim()) return;
    setLoading("deny");
    await fetch(`/api/admin/sellers/${sellerId}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: denyReason.trim() }),
    });
    setLoading(null);
    setShowDenyForm(false);
    setDenyReason("");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={approve}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === "approve" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
          Approve
        </button>
        <button
          onClick={() => setShowDenyForm(v => !v)}
          disabled={loading !== null}
          className="flex items-center gap-1.5 rounded-lg border border-error px-3 py-1.5 text-sm font-medium text-error hover:bg-error-subtle disabled:opacity-50 transition-colors"
        >
          <XCircle size={13} />
          Deny
        </button>
      </div>

      {showDenyForm && (
        <div className="space-y-2">
          <textarea
            rows={2}
            value={denyReason}
            onChange={e => setDenyReason(e.target.value)}
            placeholder="Reason for denial (optional note for records)…"
            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
          <button
            onClick={deny}
            disabled={loading !== null}
            className="flex items-center gap-1.5 rounded-lg bg-error px-3 py-1.5 text-sm font-medium text-white hover:bg-error-hover disabled:opacity-50 transition-colors"
          >
            {loading === "deny" ? <Loader2 size={13} className="animate-spin" /> : null}
            Confirm denial
          </button>
        </div>
      )}
    </div>
  );
}
