"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publishListing } from "@/lib/actions/listing";
import { Upload } from "lucide-react";

export function PublishListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);

  async function handlePublish() {
    setLoading(true);
    setError(null);
    const result = await publishListing(listingId);
    if (result?.stripeRequired) {
      setError("Connect your Stripe account first.");
      setLoading(false);
    } else if (result?.pickupAddressRequired) {
      setError(
        <>
          Add your pickup address in your{" "}
          <Link href="/seller/profile" className="underline">
            profile
          </Link>{" "}
          before publishing.
        </>
      );
      setLoading(false);
    } else if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <button
        onClick={handlePublish}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors py-2 px-1 disabled:opacity-50"
      >
        <Upload size={13} />
        {loading ? "Publishing…" : "Publish"}
      </button>
      {error && <p className="px-1 pb-1 text-xs text-error">{error}</p>}
    </div>
  );
}
