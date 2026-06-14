"use client";

import { useActionState, useState, useCallback } from "react";
import Link from "next/link";
import { createListing, updateListing, type ListingActionState } from "@/lib/actions/listing";
import { MediaUploader } from "@/components/seller/media-uploader";
import { StripeConnectButton } from "@/components/seller/stripe-connect-button";
import { ChevronDown } from "lucide-react";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-sm text-error">{messages[0]}</p>;
}

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary">
      {children}
      {required && <span className="ml-0.5 text-error"> *</span>}
    </label>
  );
}

const inputClass =
  "mt-1 block w-full rounded-lg border border-border-strong px-3 py-2 text-sm shadow-sm placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
const selectClass = `${inputClass} appearance-none pr-8`;

// Keep in sync with the limits enforced in listingSchema (actions/listing.ts).
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 5000;

function CharCount({ value, max }: { value: number; max: number }) {
  return (
    <span className={`text-xs tabular-nums ${value >= max ? "text-error" : "text-text-muted"}`}>
      {value}/{max}
    </span>
  );
}

type Category = { id: string; name: string };
type ExistingListing = {
  id: string;
  categoryId: string | null;
  title: string;
  description: string;
  priceAmount: number;
  stock: number;
  status: string;
  videoUrl: string | null;
  isDigital: boolean;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  images: { url: string; altText: string | null }[];
};
type Props = { userId: string; categories: Category[]; listing?: ExistingListing; stripeOnboardingDone?: boolean; selfManagedShipping?: boolean };

export function ListingForm({ userId, categories, listing, stripeOnboardingDone = false, selfManagedShipping = false }: Props) {
  const serverAction = listing ? updateListing : createListing;
  const [state, action, isPending] = useActionState<ListingActionState, FormData>(
    serverAction,
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [isDigital, setIsDigital] = useState(listing?.isDigital ?? false);
  const [titleLen, setTitleLen] = useState(listing?.title.length ?? 0);
  const [descLen, setDescLen] = useState(listing?.description.length ?? 0);
  const handleBusyChange = useCallback((busy: boolean) => setUploading(busy), []);

  return (
    <form action={action} className="space-y-6">
      {listing && <input type="hidden" name="listingId" value={listing.id} />}

      {/* Media */}
      <MediaUploader
        userId={userId}
        onBusyChange={handleBusyChange}
        initialImages={listing?.images}
        initialVideoUrl={listing?.videoUrl}
      />

      {/* Category */}
      <div>
        <Label htmlFor="categoryId" required>
          Category
        </Label>
        <div className="relative">
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={listing?.categoryId ?? ""}
          className={selectClass}
        >
          <option value="" disabled>Select a category…</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
        </div>
        <FieldError messages={state?.fieldErrors?.categoryId} />
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="title" required>
            Title
          </Label>
          <CharCount value={titleLen} max={TITLE_MAX} />
        </div>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={TITLE_MAX}
          placeholder="e.g. Hand-thrown ceramic mug"
          defaultValue={listing?.title}
          onChange={(e) => setTitleLen(e.target.value.length)}
          className={inputClass}
        />
        <FieldError messages={state?.fieldErrors?.title} />
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="description" required>
            Description
          </Label>
          <CharCount value={descLen} max={DESCRIPTION_MAX} />
        </div>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          maxLength={DESCRIPTION_MAX}
          placeholder="Describe your item: materials, dimensions, care instructions…"
          defaultValue={listing?.description}
          onChange={(e) => setDescLen(e.target.value.length)}
          className={inputClass}
        />
        <FieldError messages={state?.fieldErrors?.description} />
      </div>

      {/* Price + Stock */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priceEuros" required>
            Price
          </Label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-text-secondary">
              €
            </span>
            <input
              id="priceEuros"
              name="priceEuros"
              type="number"
              required
              min="0.01"
              max="10000"
              step="0.01"
              placeholder="0.00"
              defaultValue={listing ? (listing.priceAmount / 100).toFixed(2) : undefined}
              className="block w-full rounded-lg border border-border-strong py-2 pl-7 pr-3 text-sm shadow-sm placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <FieldError messages={state?.fieldErrors?.priceEuros} />
          {selfManagedShipping && !isDigital && (
            <p className="mt-1 text-xs text-text-muted">
              You cover delivery, so factor shipping costs into your price.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="stock" required>
            Stock
          </Label>
          <input
            id="stock"
            name="stock"
            type="number"
            required
            min="0"
            max="9999"
            step="1"
            defaultValue={listing?.stock ?? 1}
            className={inputClass}
          />
          <FieldError messages={state?.fieldErrors?.stock} />
        </div>
      </div>

      {/* Digital / Physical toggle */}
      <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
        <input
          id="isDigital"
          name="isDigital"
          type="checkbox"
          value="true"
          checked={isDigital}
          onChange={(e) => setIsDigital(e.target.checked)}
          className="h-4 w-4 rounded border-border-strong text-text-primary focus:ring-brand"
        />
        <div>
          <label htmlFor="isDigital" className="cursor-pointer text-sm font-medium text-text-secondary">
            Digital product
          </label>
          <p className="text-xs text-text-muted">No shipping required, buyers receive a download link</p>
        </div>
      </div>

      {/* Shipping fields, physical listings only */}
      {!isDigital && (
        <div className="rounded-lg border border-border p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Dimensions</p>
          </div>

          <div>
            <Label htmlFor="weightGrams" required>Weight (g)</Label>
            <input
              id="weightGrams"
              name="weightGrams"
              type="number"
              min="1"
              max="999000"
              step="1"
              placeholder="e.g. 500"
              defaultValue={listing?.weightGrams ?? undefined}
              className={inputClass}
            />
            <FieldError messages={state?.fieldErrors?.weightGrams} />
          </div>

          <div>
            <Label htmlFor="lengthCm" required>Dimensions (cm)</Label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <input id="lengthCm" name="lengthCm" type="number" min="1" max="999" step="1" placeholder="L" defaultValue={listing?.lengthCm ?? undefined} className={inputClass} />
              <input name="widthCm" type="number" min="1" max="999" step="1" placeholder="W" defaultValue={listing?.widthCm ?? undefined} className={inputClass} />
              <input name="heightCm" type="number" min="1" max="999" step="1" placeholder="H" defaultValue={listing?.heightCm ?? undefined} className={inputClass} />
            </div>
            <FieldError messages={state?.fieldErrors?.dimensions} />
          </div>
        </div>
      )}

      {state?.error && (
        <p className="rounded-md bg-error-subtle px-4 py-3 text-sm text-error">
          {state.error}
        </p>
      )}

      {state?.pickupAddressRequired && (
        <p className="rounded-md bg-error-subtle px-4 py-3 text-sm text-error">
          Add your pickup address in your profile before publishing a physical listing.{" "}
          <Link href="/seller/profile" className="underline font-medium">
            Go to profile
          </Link>
        </p>
      )}

      {state?.stripeRequired && (
        <div className="rounded-lg border border-warning bg-warning-subtle px-4 py-4">
          <p className="text-sm font-medium text-text-primary">Listing saved as a draft</p>
          <p className="mt-1 text-sm text-warning-fg">
            Connect your Stripe account to publish it and start receiving payments.
          </p>
          <div className="mt-3">
            <StripeConnectButton />
          </div>
        </div>
      )}

      <div className="space-y-2 pt-2">
        <div className="flex gap-3">
          {/* Publish is the primary action when creating or editing a draft.
              An already-active listing only needs "Save changes". */}
          {(!listing || listing.status === "DRAFT") && (
            <button
              type="submit"
              name="publishNow"
              value="true"
              disabled={isPending || uploading || !stripeOnboardingDone}
              className="flex-1 rounded-lg bg-btn-neutral px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-btn-neutral-hover disabled:opacity-50"
            >
              {uploading ? "Uploading media…" : isPending ? "Publishing…" : "Publish"}
            </button>
          )}

          <button
            type="submit"
            disabled={isPending || uploading}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              !listing || listing.status === "DRAFT"
                ? "border border-border-strong text-text-secondary hover:border-border-strong hover:text-text-primary"
                : "bg-btn-neutral text-white hover:bg-btn-neutral-hover"
            }`}
          >
            {uploading
              ? "Uploading media…"
              : isPending
                ? "Saving…"
                : listing
                  ? listing.status === "DRAFT"
                    ? "Save as draft"
                    : "Save changes"
                  : "Save as draft"}
          </button>
        </div>

        {(!listing || listing.status === "DRAFT") && !stripeOnboardingDone && (
          <p className="text-xs text-text-muted">
            Connect your Stripe account to publish. You can save it as a draft for now.
          </p>
        )}
      </div>
    </form>
  );
}
