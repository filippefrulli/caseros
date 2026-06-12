"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { SHIPPING_COUNTRIES, countryName, flagEmoji, countryFromLocale } from "@/lib/countries";
import { setVisitorCountry } from "@/lib/actions/visitor";

// Compact shipping-destination selector (Etsy-style): shows just the flag, opens
// a dropdown on click. Works for anonymous visitors — listings are filtered to
// those whose seller ships to the chosen country.
export function CountryPicker({ current }: { current: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Auto-detect from the browser locale when we couldn't determine a country
  // server-side (no cookie, no geo header). Runs once.
  useEffect(() => {
    if (current) return;
    const detected = (navigator.languages ?? [navigator.language])
      .map(countryFromLocale)
      .find(Boolean);
    if (detected) {
      startTransition(async () => {
        await setVisitorCountry(detected);
        router.refresh();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(code: string) {
    setOpen(false);
    startTransition(async () => {
      await setVisitorCountry(code);
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-label={current ? `Shipping to ${countryName(current)}` : "Select shipping country"}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-lg leading-none hover:border-gray-400 disabled:opacity-50 transition-colors"
      >
        {current ? (
          <span aria-hidden>{flagEmoji(current)}</span>
        ) : (
          <Globe size={16} className="text-gray-400" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-80 w-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <p className="px-3 pb-1.5 pt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Ship to
          </p>
          {SHIPPING_COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => choose(c.code)}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
            >
              <span className="text-base leading-none" aria-hidden>{flagEmoji(c.code)}</span>
              <span className={c.code === current ? "font-semibold text-gray-900" : "text-gray-700"}>
                {c.name}
              </span>
              {c.code === current && <Check size={14} className="ml-auto text-gray-900" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
