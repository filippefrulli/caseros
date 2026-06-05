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
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
        <p className="text-xs text-gray-500">Tracking number</p>
        <p className="font-mono text-sm font-semibold text-gray-900">{trackingCode}</p>
        <div className="flex gap-2 flex-wrap">
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-600 underline hover:text-gray-900"
            >
              Track parcel
            </a>
          )}
          <a
            href={`/api/seller/orders/${orderId}/label-download`}
            download
            className="text-xs text-gray-600 underline hover:text-gray-900"
          >
            Download label PDF
          </a>
        </div>
      </div>
    );
  }

  if (!sendcloudConfigured) {
    return (
      <p className="mt-3 text-xs text-gray-400">
        Shipping not configured — contact support.
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
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";

  return (
    <div className="mt-3 rounded-lg border border-gray-200 p-3 space-y-3">
      {error && <p className="text-xs text-error">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Weight (g) *</label>
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
          <label className="block text-xs text-gray-500 mb-1">Dimensions (cm)</label>
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
        className="w-full rounded-lg bg-gray-900 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Generating…" : "Generate shipping label"}
      </button>
    </div>
  );
}
