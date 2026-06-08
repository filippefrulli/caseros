"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { track } from "@vercel/analytics";

interface BuyNowButtonProps {
  listingId: string;
  slug: string;
  stock: number;
  payable: boolean;
  isLoggedIn: boolean;
  isDigital: boolean;
}

const MAX_QTY = 10;

export function BuyNowButton({ listingId, slug, stock, payable, isLoggedIn, isDigital }: BuyNowButtonProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxAllowed = Math.min(stock, MAX_QTY);
  const outOfStock = stock <= 0;

  const handleClick = async () => {
    setError(null);

    if (!isLoggedIn) {
      router.push(`/login?next=/listings/${slug}`);
      return;
    }

    setLoading(true);
    track("buy_now_clicked", { isDigital });

    // Physical listings go through the pre-checkout page to collect address + shipping rate.
    if (!isDigital) {
      window.location.href = `/checkout/${listingId}?quantity=${quantity}`;
      return;
    }

    // Digital listings go straight to Stripe.
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, quantity }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const disabled = loading || outOfStock || !payable;

  return (
    <div className="flex-1">
      {!outOfStock && payable && (
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm text-gray-600">Quantity</span>
          <div className="flex items-center rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || loading}
              aria-label="Decrease quantity"
              className="flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="flex h-9 w-10 items-center justify-center text-sm font-medium tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
              disabled={quantity >= maxAllowed || loading}
              aria-label="Increase quantity"
              className="flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-900 transition-colors"
      >
        {outOfStock
          ? "Out of stock"
          : !payable
            ? "Not available for purchase"
            : loading
              ? "Redirecting…"
              : "Buy now"}
      </button>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
}
