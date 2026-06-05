"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { ShippoRate } from "@/lib/shippo";

const EU_COUNTRIES = [
  { code: "IE", name: "Ireland" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "GB", name: "United Kingdom" },
  { code: "NO", name: "Norway" },
  { code: "CH", name: "Switzerland" },
];

const countryName = (code: string) =>
  EU_COUNTRIES.find((c) => c.code === code)?.name ?? code;

const inputClass =
  "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";
const selectClass = `${inputClass} appearance-none pr-8`;

type Address = {
  name: string;
  line1: string;
  houseNumber: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
};

type SavedAddress = {
  name: string | null;
  line1: string;
  houseNumber: string | null;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  phone: string | null;
};

type Props = {
  listingId: string;
  listingSlug: string;
  isDigital: boolean;
  priceAmount: number;
  currency: string;
  quantity: number;
  shippoReady: boolean;
  sellerPickupReady: boolean;
  savedAddress?: SavedAddress | null;
};

export function CheckoutFlow({
  listingId,
  listingSlug,
  isDigital,
  priceAmount,
  currency,
  quantity,
  shippoReady,
  sellerPickupReady,
  savedAddress,
}: Props) {
  const hasSaved = !!savedAddress;

  const [address, setAddress] = useState<Address>({
    name: savedAddress?.name ?? "",
    line1: savedAddress?.line1 ?? "",
    houseNumber: savedAddress?.houseNumber ?? "",
    line2: savedAddress?.line2 ?? "",
    city: savedAddress?.city ?? "",
    postalCode: savedAddress?.postalCode ?? "",
    country: savedAddress?.country ?? "IE",
    phone: savedAddress?.phone ?? "",
  });

  // When there's a saved address start in "summary" mode; otherwise go straight to the form.
  const [showForm, setShowForm] = useState(!hasSaved);

  const [rates, setRates] = useState<ShippoRate[] | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippoRate | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  function setField(field: keyof Address) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setAddress((prev) => ({ ...prev, [field]: e.target.value }));
      setRates(null);
      setSelectedRate(null);
      setRatesError(null);
    };
  }

  const addressComplete = !!(
    address.name.trim() &&
    address.line1.trim() &&
    address.city.trim() &&
    address.postalCode.trim() &&
    address.country
  );

  const fetchRates = useCallback(async (addr: Address) => {
    setRatesLoading(true);
    setRatesError(null);
    setRates(null);
    setSelectedRate(null);

    const params = new URLSearchParams({
      listingId,
      line1: addr.line1,
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.country,
    });
    if (addr.houseNumber) params.set("houseNumber", addr.houseNumber);

    try {
      const res = await fetch(`/api/shipping-rates?${params}`);
      const data = await res.json() as { rates?: ShippoRate[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not fetch shipping rates.");
      const fetched = data.rates ?? [];
      setRates(fetched);
      if (fetched.length > 0) setSelectedRate(fetched[0]);
    } catch (e) {
      setRatesError(e instanceof Error ? e.message : "Could not fetch shipping rates.");
    } finally {
      setRatesLoading(false);
    }
  }, [listingId]);

  // Auto-fetch rates on mount when a saved address is available.
  useEffect(() => {
    if (hasSaved && !isDigital && shippoReady && sellerPickupReady) {
      fetchRates(address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePayment() {
    setCheckoutLoading(true);
    setCheckoutError(null);

    const body: Record<string, unknown> = { listingId, quantity };

    if (!isDigital) {
      body.address = {
        name: address.name,
        line1: address.line1,
        houseNumber: address.houseNumber || null,
        line2: address.line2 || null,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
        phone: address.phone || null,
      };
      if (selectedRate) {
        body.shippingRate = {
          amount: Math.round(parseFloat(selectedRate.amount) * 100),
          displayName: `${selectedRate.provider} ${selectedRate.servicelevel}`,
        };
      }
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setCheckoutError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setCheckoutError("Network error. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const itemsTotal = priceAmount * quantity;
  const shippingTotal = selectedRate ? Math.round(parseFloat(selectedRate.amount) * 100) : 0;
  const grandTotal = itemsTotal + shippingTotal;

  // ── Digital listing ────────────────────────────────────────────────────────
  if (isDigital) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="mb-3 text-sm font-semibold text-gray-700">Order summary</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Item × {quantity}</span>
            <span className="tabular-nums font-medium">{formatPrice(itemsTotal, currency)}</span>
          </div>
        </div>
        {checkoutError && <p className="text-sm text-red-600">{checkoutError}</p>}
        <button
          onClick={handlePayment}
          disabled={checkoutLoading}
          className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {checkoutLoading ? "Redirecting…" : `Pay ${formatPrice(itemsTotal, currency)}`}
        </button>
      </div>
    );
  }

  // ── Shipping not available ─────────────────────────────────────────────────
  if (!shippoReady || !sellerPickupReady) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        {!shippoReady
          ? "Shipping is not yet configured for this platform."
          : "The seller has not set up their shipping address yet. Check back soon."}
      </div>
    );
  }

  const canProceed = rates !== null && selectedRate !== null;

  return (
    <div className="space-y-6">

      {/* ── Saved address summary ── */}
      {hasSaved && !showForm && (
        <div className="rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Shipping to</p>
              <address className="not-italic text-sm text-gray-700 leading-relaxed">
                {address.name && <p className="font-medium">{address.name}</p>}
                <p>{address.line1}{address.houseNumber ? ` ${address.houseNumber}` : ""}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>{address.postalCode} {address.city}</p>
                <p>{countryName(address.country)}</p>
                {address.phone && <p className="text-gray-500">{address.phone}</p>}
              </address>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setRates(null);
                setSelectedRate(null);
              }}
              className="shrink-0 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 transition-colors"
            >
              Use a different address
            </button>
          </div>
        </div>
      )}

      {/* ── Address form ── */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Shipping address</p>
            {hasSaved && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setAddress({
                    name: savedAddress.name ?? "",
                    line1: savedAddress.line1,
                    houseNumber: savedAddress.houseNumber ?? "",
                    line2: savedAddress.line2 ?? "",
                    city: savedAddress.city,
                    postalCode: savedAddress.postalCode,
                    country: savedAddress.country,
                    phone: savedAddress.phone ?? "",
                  });
                  setRates(null);
                  setSelectedRate(null);
                }}
                className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 transition-colors"
              >
                ← Use saved address
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
            <input type="text" placeholder="Jane Smith" value={address.name} onChange={setField("name")} className={inputClass} />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Street address</label>
              <input type="text" placeholder="Main Street" value={address.line1} onChange={setField("line1")} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">No.</label>
              <input type="text" placeholder="12" value={address.houseNumber} onChange={setField("houseNumber")} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Apt / suite (optional)</label>
            <input type="text" placeholder="Apartment 3B" value={address.line2} onChange={setField("line2")} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Postal code</label>
              <input type="text" placeholder="D01 F5P2" value={address.postalCode} onChange={setField("postalCode")} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <input type="text" placeholder="Dublin" value={address.city} onChange={setField("city")} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
            <div className="relative">
              <select value={address.country} onChange={setField("country")} className={selectClass}>
                {EU_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
            <input type="tel" placeholder="+353 1 234 5678" value={address.phone} onChange={setField("phone")} className={inputClass} />
          </div>

          <button
            type="button"
            onClick={() => fetchRates(address)}
            disabled={!addressComplete || ratesLoading}
            className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            {ratesLoading ? "Fetching shipping options…" : "Check shipping options →"}
          </button>

          {ratesError && <p className="text-xs text-red-600">{ratesError}</p>}
        </div>
      )}

      {/* ── Loading indicator for auto-fetch ── */}
      {ratesLoading && !showForm && (
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-400">Calculating shipping options…</p>
        </div>
      )}

      {/* ── Rate error (saved address mode) ── */}
      {ratesError && !showForm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {ratesError}
        </div>
      )}

      {/* ── Shipping options ── */}
      {rates !== null && rates.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            Shipping to {address.city}, {countryName(address.country)}
          </p>
          <div className="space-y-2">
            {rates.map((rate) => {
              const isSelected = selectedRate?.objectId === rate.objectId;
              return (
                <button
                  key={rate.objectId}
                  type="button"
                  onClick={() => setSelectedRate(rate)}
                  className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                    isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`h-4 w-4 shrink-0 rounded-full border-2 ${isSelected ? "border-gray-900 bg-gray-900" : "border-gray-300"}`} />
                    <div>
                      <span className="font-medium text-gray-900">{rate.provider}</span>
                      <span className="ml-1.5 text-gray-500">{rate.servicelevel}</span>
                      {rate.estimatedDays != null && (
                        <span className="ml-1.5 text-gray-400">· {rate.estimatedDays} days</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-gray-900">
                    {rate.currency} {parseFloat(rate.amount).toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {rates !== null && rates.length === 0 && (
        <div className="rounded-xl border border-gray-200 p-5 text-sm text-gray-500">
          No shipping options available for this address. Please check your address or contact the seller.
        </div>
      )}

      {/* ── Order summary + pay ── */}
      {canProceed && (
        <div className="rounded-xl border border-gray-200 p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Order summary</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Item × {quantity}</span>
              <span className="tabular-nums">{formatPrice(itemsTotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span className="tabular-nums">{formatPrice(shippingTotal, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(grandTotal, currency)}</span>
            </div>
          </div>
          {checkoutError && <p className="text-sm text-red-600">{checkoutError}</p>}
          <button
            onClick={handlePayment}
            disabled={checkoutLoading}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {checkoutLoading ? "Redirecting to payment…" : `Pay ${formatPrice(grandTotal, currency)}`}
          </button>
          <p className="text-center text-xs text-gray-400">Secure payment via Stripe</p>
        </div>
      )}
    </div>
  );
}
