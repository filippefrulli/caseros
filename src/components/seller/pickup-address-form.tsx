"use client";

import { useActionState, useEffect, useRef } from "react";
import { updatePickupAddress, type PickupAddressState } from "@/lib/actions/seller";
import { ChevronDown } from "lucide-react";

const EU_COUNTRIES = [
  ["AT", "Austria"], ["BE", "Belgium"], ["BG", "Bulgaria"], ["HR", "Croatia"],
  ["CY", "Cyprus"], ["CZ", "Czech Republic"], ["DK", "Denmark"], ["EE", "Estonia"],
  ["FI", "Finland"], ["FR", "France"], ["DE", "Germany"], ["GR", "Greece"],
  ["HU", "Hungary"], ["IE", "Ireland"], ["IT", "Italy"], ["LV", "Latvia"],
  ["LT", "Lithuania"], ["LU", "Luxembourg"], ["MT", "Malta"], ["NL", "Netherlands"],
  ["PL", "Poland"], ["PT", "Portugal"], ["RO", "Romania"], ["SK", "Slovakia"],
  ["SI", "Slovenia"], ["ES", "Spain"], ["SE", "Sweden"], ["GB", "United Kingdom"],
  ["CH", "Switzerland"], ["NO", "Norway"],
] as const;

const inputCls = "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";
const selectCls = `${inputCls} appearance-none pr-8`;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-error">{messages[0]}</p>;
}

type Props = {
  initial: {
    pickupName: string | null;
    pickupLine1: string | null;
    pickupLine2: string | null;
    pickupHouseNumber: string | null;
    pickupCity: string | null;
    pickupPostalCode: string | null;
    pickupCountry: string | null;
    pickupPhone: string | null;
  };
};

export function PickupAddressForm({ initial }: Props) {
  const [state, action, isPending] = useActionState<PickupAddressState, FormData>(
    updatePickupAddress,
    null,
  );

  // After a successful save the action returns the persisted values.
  // We derive what to show from that, falling back to the server-rendered initial prop.
  const values = state?.data ?? initial;

  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.success) bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state?.success]);

  // Keying the form on the current values causes React to remount it whenever a
  // save succeeds, so all defaultValue props are re-applied with the saved data.
  const formKey = JSON.stringify(values);

  return (
    <form key={formKey} action={action} className="space-y-4">
      {state?.success && (
        <div ref={bannerRef} className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Pickup address saved.
        </div>
      )}
      {state?.error && (
        <div className="rounded-lg bg-error-subtle border border-error px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="pickupName" className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-error">*</span>
        </label>
        <input id="pickupName" name="pickupName" type="text" required defaultValue={values.pickupName ?? ""} placeholder="Your name or business name" className={inputCls} />
        <FieldError messages={state?.fieldErrors?.pickupName} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label htmlFor="pickupLine1" className="block text-sm font-medium text-gray-700 mb-1">
            Street <span className="text-error">*</span>
          </label>
          <input id="pickupLine1" name="pickupLine1" type="text" required defaultValue={values.pickupLine1 ?? ""} placeholder="Street name" className={inputCls} />
          <FieldError messages={state?.fieldErrors?.pickupLine1} />
        </div>
        <div>
          <label htmlFor="pickupHouseNumber" className="block text-sm font-medium text-gray-700 mb-1">
            No.
          </label>
          <input id="pickupHouseNumber" name="pickupHouseNumber" type="text" defaultValue={values.pickupHouseNumber ?? ""} placeholder="12A" className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="pickupLine2" className="block text-sm font-medium text-gray-700 mb-1">
          Address line 2
        </label>
        <input id="pickupLine2" name="pickupLine2" type="text" defaultValue={values.pickupLine2 ?? ""} placeholder="Apartment, floor, etc." className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pickupPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
            Postal code <span className="text-error">*</span>
          </label>
          <input id="pickupPostalCode" name="pickupPostalCode" type="text" required defaultValue={values.pickupPostalCode ?? ""} placeholder="e.g. 1010" className={inputCls} />
          <FieldError messages={state?.fieldErrors?.pickupPostalCode} />
        </div>
        <div>
          <label htmlFor="pickupCity" className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-error">*</span>
          </label>
          <input id="pickupCity" name="pickupCity" type="text" required defaultValue={values.pickupCity ?? ""} placeholder="e.g. Vienna" className={inputCls} />
          <FieldError messages={state?.fieldErrors?.pickupCity} />
        </div>
      </div>

      <div>
        <label htmlFor="pickupCountry" className="block text-sm font-medium text-gray-700 mb-1">
          Country <span className="text-error">*</span>
        </label>
        <div className="relative">
          <select id="pickupCountry" name="pickupCountry" required defaultValue={values.pickupCountry ?? ""} className={selectCls}>
            <option value="" disabled>Select country…</option>
            {EU_COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <FieldError messages={state?.fieldErrors?.pickupCountry} />
      </div>

      <div>
        <label htmlFor="pickupPhone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone <span className="text-error">*</span>
        </label>
        <input id="pickupPhone" name="pickupPhone" type="tel" required defaultValue={values.pickupPhone ?? ""} placeholder="+43 123 456 789" className={inputCls} />
        <FieldError messages={state?.fieldErrors?.pickupPhone} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Saving…" : "Save pickup address"}
      </button>
    </form>
  );
}
