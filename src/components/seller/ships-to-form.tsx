"use client";

import { useActionState, useState } from "react";
import { updateShipsToCountries, type ShipsToState } from "@/lib/actions/seller";
import { SHIPPING_COUNTRIES } from "@/lib/countries";

export function ShipsToForm({ initial }: { initial: string[] }) {
  const [state, action, isPending] = useActionState<ShipsToState, FormData>(
    updateShipsToCountries,
    null,
  );

  // Controlled selection so the count + select-all stay in sync.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(state?.data ?? initial),
  );

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const allSelected = selected.size === SHIPPING_COUNTRIES.length;

  return (
    <form action={action} className="space-y-4">
      {state?.success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Shipping destinations saved.
        </div>
      )}
      {state?.error && (
        <div className="rounded-lg bg-error-subtle border border-error px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">{selected.size} selected</p>
        <button
          type="button"
          onClick={() =>
            setSelected(allSelected ? new Set() : new Set(SHIPPING_COUNTRIES.map((c) => c.code)))
          }
          className="text-xs text-text-secondary underline hover:text-text-primary"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {SHIPPING_COUNTRIES.map((c) => (
          <label key={c.code} className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="countries"
              value={c.code}
              checked={selected.has(c.code)}
              onChange={() => toggle(c.code)}
              className="h-4 w-4 rounded border-border-strong accent-gray-900"
            />
            {c.name}
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={isPending || selected.size === 0}
        className="w-full rounded-lg bg-btn-neutral py-2.5 text-sm font-medium text-white hover:bg-btn-neutral-hover disabled:opacity-50 transition-colors"
      >
        {isPending ? "Saving…" : "Save shipping destinations"}
      </button>
    </form>
  );
}
