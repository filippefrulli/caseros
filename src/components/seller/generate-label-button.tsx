"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  orderId: string;
  status: string;
  defaultWeightGrams: number | null;
  defaultLengthCm: number | null;
  defaultWidthCm: number | null;
  defaultHeightCm: number | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  sendcloudConfigured: boolean;
  sellerPickupReady: boolean;
};

export function GenerateLabelButton({
  orderId,
  status,
  defaultWeightGrams,
  defaultLengthCm,
  defaultWidthCm,
  defaultHeightCm,
  trackingCode,
  trackingUrl,
  sendcloudConfigured,
  sellerPickupReady,
}: Props) {
  const router = useRouter();
  const [weightGrams, setWeightGrams] = useState(defaultWeightGrams ?? 0);
  const [lengthCm, setLengthCm] = useState(defaultLengthCm ?? 0);
  const [widthCm, setWidthCm] = useState(defaultWidthCm ?? 0);
  const [heightCm, setHeightCm] = useState(defaultHeightCm ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (trackingCode) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-bg-subtle px-4 py-3 space-y-2">
        <p className="text-xs text-text-secondary">Tracking number</p>
        <p className="font-mono text-sm font-semibold text-text-primary">{trackingCode}</p>
        <div className="flex gap-2 flex-wrap">
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-secondary underline hover:text-text-primary"
            >
              Track parcel
            </a>
          )}
          <a
            href={`/api/seller/orders/${orderId}/label-download`}
            download
            className="text-xs text-text-secondary underline hover:text-text-primary"
          >
            Download label PDF
          </a>
        </div>
      </div>
    );
  }

  if (!sendcloudConfigured) {
    return (
      <p className="mt-3 text-xs text-text-muted">
        Shipping not configured: contact support.
      </p>
    );
  }

  if (!sellerPickupReady) {
    return (
      <p className="mt-3 text-xs text-warning-fg">
        <Link href="/seller/profile" className="underline hover:text-warning-fg">
          Add your pickup address
        </Link>{" "}
        to generate a shipping label.
      </p>
    );
  }

  if (status !== "PROCESSING") return null;

  async function handleGenerate() {
    if (!weightGrams || weightGrams <= 0) {
      setError("Enter the parcel weight.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/seller/orders/${orderId}/label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightGrams,
          lengthCm: lengthCm || null,
          widthCm: widthCm || null,
          heightCm: heightCm || null,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error: please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "block w-full rounded-md border border-border-strong px-2 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

  return (
    <div className="mt-3 rounded-lg border border-border p-3 space-y-3">
      {error && <p className="text-xs text-error">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-text-secondary mb-1">Weight (g) *</label>
          <input
            type="number"
            min="1"
            max="999000"
            value={weightGrams || ""}
            onChange={(e) => setWeightGrams(Number(e.target.value))}
            placeholder="e.g. 500"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Dimensions (cm)</label>
          <div className="grid grid-cols-3 gap-1">
            <input type="number" min="1" max="999" value={lengthCm || ""} onChange={(e) => setLengthCm(Number(e.target.value))} placeholder="L" className={inputCls} />
            <input type="number" min="1" max="999" value={widthCm || ""} onChange={(e) => setWidthCm(Number(e.target.value))} placeholder="W" className={inputCls} />
            <input type="number" min="1" max="999" value={heightCm || ""} onChange={(e) => setHeightCm(Number(e.target.value))} placeholder="H" className={inputCls} />
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full rounded-lg bg-btn-neutral py-2 text-xs font-medium text-white hover:bg-btn-neutral-hover disabled:opacity-50 transition-colors"
      >
        {loading ? "Generating…" : "Generate shipping label"}
      </button>
    </div>
  );
}
