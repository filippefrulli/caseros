"use client";

import { useActionState, useState, useCallback } from "react";
import { createListing, updateListing, type ListingActionState } from "@/lib/actions/listing";
import { MediaUploader } from "@/components/seller/media-uploader";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{messages[0]}</p>;
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
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
      {required && <span className="ml-0.5 text-red-500"> *</span>}
    </label>
  );
}

const inputClass =
  "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";

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
  images: { url: string; altText: string | null }[];
};
type Props = { userId: string; categories: Category[]; listing?: ExistingListing };

export function ListingForm({ userId, categories, listing }: Props) {
  const serverAction = listing ? updateListing : createListing;
  const [state, action, isPending] = useActionState<ListingActionState, FormData>(
    serverAction,
    null,
  );
  const [uploading, setUploading] = useState(false);
  const handleBusyChange = useCallback((busy: boolean) => setUploading(busy), []);

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

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
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={listing?.categoryId ?? ""}
          className={inputClass}
        >
          <option value="" disabled>Select a category…</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <FieldError messages={state?.fieldErrors?.categoryId} />
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title" required>
          Title
        </Label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={100}
          placeholder="e.g. Hand-thrown ceramic mug"
          defaultValue={listing?.title}
          className={inputClass}
        />
        <FieldError messages={state?.fieldErrors?.title} />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" required>
          Description
        </Label>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          maxLength={5000}
          placeholder="Describe your item — materials, dimensions, care instructions…"
          defaultValue={listing?.description}
          className={inputClass}
        />
        <FieldError messages={state?.fieldErrors?.description} />
      </div>

      {/* Price + Stock side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priceEuros" required>
            Price
          </Label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
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
              className="block w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <FieldError messages={state?.fieldErrors?.priceEuros} />
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

      {/* Publish now — only on create */}
      {!listing && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
          <input
            id="publishNow"
            name="publishNow"
            type="checkbox"
            value="true"
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <div>
            <label
              htmlFor="publishNow"
              className="cursor-pointer text-sm font-medium text-gray-700"
            >
              Publish immediately
            </label>
            <p className="text-xs text-gray-400">
              Leave unchecked to save as a draft first
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || uploading}
          className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {uploading ? "Uploading media…" : isPending ? "Saving…" : listing ? "Save changes" : "Save listing"}
        </button>
      </div>
    </form>
  );
}
