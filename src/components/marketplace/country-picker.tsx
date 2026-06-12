"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin } from "lucide-react";
import { SHIPPING_COUNTRIES, countryName } from "@/lib/countries";
import { setVisitorCountry } from "@/lib/actions/visitor";

// Shipping-destination picker (works for anonymous visitors). Listings are
// filtered to those whose seller ships to the chosen country. When the visitor
// hasn't chosen yet, prompts them to.
export function CountryPicker({ current, chosen }: { current: string | null; chosen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(code: string) {
    setOpen(false);
    startTransition(async () => {
      await setVisitorCountry(code);
      router.refresh();
    });
  }

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm">
        <span className="text-text-muted">
          {chosen ? "Shipping to" : "Choose where to ship — we'll show items available to you:"}
        </span>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 font-medium text-gray-900 hover:border-gray-400 disabled:opacity-50"
          >
            <MapPin size={14} className="text-gray-400" />
            {current ? countryName(current) : "Select country"}
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {open && (
            <div className="absolute left-0 z-50 mt-1 max-h-72 w-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {SHIPPING_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => choose(c.code)}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                    c.code === current ? "font-semibold text-gray-900" : "text-gray-700"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
