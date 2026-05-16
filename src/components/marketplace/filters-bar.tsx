"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { ChevronDown, X } from "lucide-react";

const MAX_EUR = 500;
// Internal slider positions run 0–1000 for smooth dragging.
// Prices map through a square curve so the lower half of the slider (0–500)
// covers €0–€125, giving much more precision in the common €10–€100 range.
const SLIDER_MAX = 1000;

function posToPrice(pos: number): number {
  return Math.round(MAX_EUR * Math.pow(pos / SLIDER_MAX, 2));
}

function priceToPos(price: number): number {
  return Math.round(SLIDER_MAX * Math.sqrt(price / MAX_EUR));
}

const rangeInputCls = [
  "absolute w-full h-full appearance-none bg-transparent pointer-events-none",
  "[&::-webkit-slider-runnable-track]:bg-transparent",
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px]",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900",
  "[&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white",
  "[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer",
  "[&::-moz-range-track]:bg-transparent",
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none",
  "[&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px]",
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gray-900",
  "[&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-white",
  "[&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-pointer",
].join(" ");

export type Country = { code: string; name: string };

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

function FiltersBarInner({ availableCountries }: { availableCountries: Country[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedCodes = (searchParams.get("countries") ?? "").split(",").filter(Boolean);
  const urlMin = Number(searchParams.get("minPrice") ?? 0);
  const urlMax = Number(searchParams.get("maxPrice") ?? MAX_EUR);
  const sort = searchParams.get("sort") ?? "newest";

  // Store positions (0–SLIDER_MAX), not prices, so the range inputs are always linear.
  const [localMin, setLocalMin] = useState(() => priceToPos(urlMin));
  const [localMax, setLocalMax] = useState(() => priceToPos(urlMax));
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalMin(priceToPos(urlMin)); }, [urlMin]);
  useEffect(() => { setLocalMax(priceToPos(urlMax)); }, [urlMax]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function push(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    router.push(`?${params.toString()}`);
  }

  function toggleCountry(code: string) {
    const next = selectedCodes.includes(code)
      ? selectedCodes.filter((c) => c !== code)
      : [...selectedCodes, code];
    push({ countries: next.length ? next.join(",") : null });
  }

  function commitPrice() {
    const minEur = posToPrice(localMin);
    const maxEur = posToPrice(localMax);
    push({
      minPrice: minEur > 0 ? String(minEur) : null,
      maxPrice: maxEur < MAX_EUR ? String(maxEur) : null,
    });
  }

  const hasFilters = selectedCodes.length > 0 || urlMin > 0 || urlMax < MAX_EUR || sort !== "newest";

  const countryLabel =
    selectedCodes.length === 0
      ? "All countries"
      : selectedCodes.length === 1
        ? (availableCountries.find((c) => c.code === selectedCodes[0])?.name ?? selectedCodes[0])
        : `${selectedCodes.length} countries`;

  return (
    <div className="flex flex-wrap items-center gap-3">

      {/* ── Country multi-select ──────────────────────────────────── */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm hover:border-border-strong transition-colors"
        >
          {countryLabel}
          <ChevronDown size={13} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-bg-card py-1 shadow-lg">
            {availableCountries.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No sellers yet</p>
            ) : (
              availableCountries.map((country) => (
                <label
                  key={country.code}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-bg-subtle"
                >
                  <input
                    type="checkbox"
                    checked={selectedCodes.includes(country.code)}
                    onChange={() => toggleCountry(country.code)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-sm">{country.name}</span>
                </label>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Price range slider ───────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        <span className="min-w-[2.5rem] text-right text-sm text-gray-500">
          €{posToPrice(localMin)}
        </span>

        <div className="relative flex h-5 w-36 items-center sm:w-44">
          {/* Track */}
          <div className="pointer-events-none absolute h-1.5 w-full rounded-full bg-gray-200">
            <div
              className="absolute h-full rounded-full bg-gray-900"
              style={{
                left: `${(localMin / SLIDER_MAX) * 100}%`,
                right: `${100 - (localMax / SLIDER_MAX) * 100}%`,
              }}
            />
          </div>

          {/* Min thumb — higher z-index when pushed against max */}
          <input
            type="range"
            min={0}
            max={SLIDER_MAX}
            step={1}
            value={localMin}
            onChange={(e) => setLocalMin(Math.min(Number(e.target.value), localMax - 1))}
            onMouseUp={commitPrice}
            onTouchEnd={commitPrice}
            className={rangeInputCls}
            style={{ zIndex: localMin > SLIDER_MAX * 0.9 ? 3 : 1 }}
          />

          {/* Max thumb */}
          <input
            type="range"
            min={0}
            max={SLIDER_MAX}
            step={1}
            value={localMax}
            onChange={(e) => setLocalMax(Math.max(Number(e.target.value), localMin + 1))}
            onMouseUp={commitPrice}
            onTouchEnd={commitPrice}
            className={rangeInputCls}
            style={{ zIndex: 2 }}
          />
        </div>

        <span className="min-w-[3rem] text-sm text-gray-500">
          {posToPrice(localMax) < MAX_EUR ? `€${posToPrice(localMax)}` : `€${MAX_EUR}+`}
        </span>
      </div>

      {/* ── Sort ────────────────────────────────────────────────── */}
      <div className="relative">
        <select
          value={sort}
          onChange={(e) => push({ sort: e.target.value === "newest" ? null : e.target.value })}
          className="appearance-none cursor-pointer rounded-lg border border-border bg-bg-card py-1.5 pl-3 pr-7 text-sm transition-colors hover:border-border-strong focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
      </div>

      {/* ── Clear ───────────────────────────────────────────────── */}
      {hasFilters && (
        <button
          onClick={() => push({ countries: null, minPrice: null, maxPrice: null, sort: null })}
          className="flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-900"
        >
          <X size={13} />
          Clear
        </button>
      )}
    </div>
  );
}

const fallback = (
  <div className="flex flex-wrap items-center gap-3">
    <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-100" />
    <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-100" />
  </div>
);

export function FiltersBar({ availableCountries }: { availableCountries: Country[] }) {
  return (
    <Suspense fallback={fallback}>
      <FiltersBarInner availableCountries={availableCountries} />
    </Suspense>
  );
}
