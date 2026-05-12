"use client";

import { useActionState } from "react";
import { createSellerProfile, type OnboardingState } from "@/lib/actions/seller";
import { useEffect, useRef, useState } from "react";

const EU_COUNTRIES = [
  { code: "AT", name: "Austria" }, { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" }, { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" }, { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" }, { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" }, { code: "FR", name: "France" },
  { code: "DE", name: "Germany" }, { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" }, { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" }, { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" }, { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" }, { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" }, { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" }, { code: "GB", name: "United Kingdom" },
  { code: "NO", name: "Norway" }, { code: "CH", name: "Switzerland" },
  { code: "IS", name: "Iceland" },
];

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{messages[0]}</p>;
}

export function OnboardingForm() {
  const [state, action, isPending] = useActionState<OnboardingState, FormData>(
    createSellerProfile,
    null,
  );

  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const slugRef = useRef<HTMLInputElement>(null);

  function handleShopNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugEdited) {
      setSlug(toSlug(e.target.value));
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugEdited(true);
    setSlug(toSlug(e.target.value));
  }

  useEffect(() => {
    if (state?.fieldErrors?.slug && slugRef.current) {
      slugRef.current.focus();
    }
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      )}

      {/* Shop name */}
      <div>
        <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
          Shop name <span className="text-red-500">*</span>
        </label>
        <input
          id="shopName"
          name="shopName"
          type="text"
          required
          maxLength={50}
          placeholder="e.g. Marta's Ceramics"
          onChange={handleShopNameChange}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
        <FieldError messages={state?.fieldErrors?.shopName} />
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          Shop URL <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 flex rounded-lg border border-gray-300 shadow-sm focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900">
          <span className="flex items-center rounded-l-lg border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 select-none">
            artcraft.com/shop/
          </span>
          <input
            ref={slugRef}
            id="slug"
            name="slug"
            type="text"
            required
            maxLength={50}
            value={slug}
            onChange={handleSlugChange}
            className="block w-full rounded-r-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <FieldError messages={state?.fieldErrors?.slug} />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          About your shop
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={500}
          placeholder="Tell buyers what makes your shop special…"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
        <FieldError messages={state?.fieldErrors?.bio} />
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700">
          Country <span className="text-red-500">*</span>
        </label>
        <select
          id="country"
          name="country"
          required
          defaultValue=""
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        >
          <option value="" disabled>Select your country</option>
          {EU_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        <FieldError messages={state?.fieldErrors?.country} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Creating shop…" : "Open my shop"}
      </button>
    </form>
  );
}
