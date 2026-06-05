"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveBuyerAddress, type BuyerAddressState } from "@/lib/actions/buyer";
import { ChevronDown } from "lucide-react";

const EU_COUNTRIES = [
  ["IE", "Ireland"], ["AT", "Austria"], ["BE", "Belgium"], ["BG", "Bulgaria"],
  ["HR", "Croatia"], ["CY", "Cyprus"], ["CZ", "Czech Republic"], ["DK", "Denmark"],
  ["EE", "Estonia"], ["FI", "Finland"], ["FR", "France"], ["DE", "Germany"],
  ["GR", "Greece"], ["HU", "Hungary"], ["IT", "Italy"], ["LV", "Latvia"],
  ["LT", "Lithuania"], ["LU", "Luxembourg"], ["MT", "Malta"], ["NL", "Netherlands"],
  ["PL", "Poland"], ["PT", "Portugal"], ["RO", "Romania"], ["SK", "Slovakia"],
  ["SI", "Slovenia"], ["ES", "Spain"], ["SE", "Sweden"], ["GB", "United Kingdom"],
  ["CH", "Switzerland"], ["NO", "Norway"],
] as const;

const inputCls = "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";
const selectCls = `${inputCls} appearance-none pr-8`;

type InitialAddress = {
  id: string;
  name: string | null;
  line1: string;
  houseNumber: string | null;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  phone: string | null;
} | null;

type Props = { initial: InitialAddress };

export function AddressForm({ initial }: Props) {
  const [state, action, isPending] = useActionState<BuyerAddressState, FormData>(
    saveBuyerAddress,
    null,
  );

  const values = state?.data ?? initial;
  const formKey = JSON.stringify(values);

  const bannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.success) bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state?.success]);

  return (
    <form key={formKey} action={action} className="space-y-4">
      {state?.success && (
        <div ref={bannerRef} className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Address saved.
        </div>
      )}
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {values?.id && <input type="hidden" name="addressId" value={values.id} />}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full name <span className="text-red-500">*</span>
        </label>
        <input id="name" name="name" type="text" required defaultValue={values?.name ?? ""} placeholder="Jane Smith" className={inputCls} />
        {state?.fieldErrors?.name && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-3">
          <label htmlFor="line1" className="block text-sm font-medium text-gray-700 mb-1">
            Street <span className="text-red-500">*</span>
          </label>
          <input id="line1" name="line1" type="text" required defaultValue={values?.line1 ?? ""} placeholder="Main Street" className={inputCls} />
          {state?.fieldErrors?.line1 && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.line1[0]}</p>}
        </div>
        <div>
          <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700 mb-1">No.</label>
          <input id="houseNumber" name="houseNumber" type="text" defaultValue={values?.houseNumber ?? ""} placeholder="12" className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="line2" className="block text-sm font-medium text-gray-700 mb-1">Apt / suite (optional)</label>
        <input id="line2" name="line2" type="text" defaultValue={values?.line2 ?? ""} placeholder="Apartment 3B" className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
            Postal code <span className="text-red-500">*</span>
          </label>
          <input id="postalCode" name="postalCode" type="text" required defaultValue={values?.postalCode ?? ""} placeholder="D01 F5P2" className={inputCls} />
          {state?.fieldErrors?.postalCode && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.postalCode[0]}</p>}
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input id="city" name="city" type="text" required defaultValue={values?.city ?? ""} placeholder="Dublin" className={inputCls} />
          {state?.fieldErrors?.city && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.city[0]}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
          Country <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select id="country" name="country" required defaultValue={values?.country ?? "IE"} className={selectCls}>
            {EU_COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {state?.fieldErrors?.country && <p className="mt-1 text-xs text-red-600">{state.fieldErrors.country[0]}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
        <input id="phone" name="phone" type="tel" defaultValue={values?.phone ?? ""} placeholder="+353 1 234 5678" className={inputCls} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Saving…" : "Save address"}
      </button>
    </form>
  );
}
