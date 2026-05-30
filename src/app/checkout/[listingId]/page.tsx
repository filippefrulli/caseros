import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { isShippoConfigured } from "@/lib/shippo";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";

type Props = { params: Promise<{ listingId: string }>; searchParams: Promise<{ quantity?: string }> };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { listingId } = await params;
  const { quantity: rawQty } = await searchParams;
  const quantity = Math.max(1, Math.min(10, parseInt(rawQty ?? "1", 10) || 1));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/${listingId}`);

  const listing = await prisma.listing.findUnique({
    where: { id: listingId, deletedAt: null, status: "ACTIVE" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      seller: {
        select: {
          id: true,
          shopName: true,
          slug: true,
          stripeOnboardingDone: true,
          payoutsEnabled: true,
          pickupLine1: true,
          pickupCity: true,
          pickupPostalCode: true,
          pickupCountry: true,
        },
      },
    },
  });

  if (!listing) notFound();

  // Can't buy your own listing
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id }, select: { id: true } });
  const sellerUserId = await prisma.sellerProfile.findUnique({
    where: { id: listing.seller.id },
    select: { userId: true },
  });
  if (dbUser && sellerUserId && dbUser.id === sellerUserId.userId) {
    redirect(`/listings/${listing.slug}`);
  }

  const payable = listing.seller.stripeOnboardingDone && listing.seller.payoutsEnabled;
  if (!payable) redirect(`/listings/${listing.slug}`);

  const savedAddress = await prisma.address.findFirst({
    where: { userId: dbUser?.id, isDefault: true },
    select: { name: true, line1: true, houseNumber: true, line2: true, city: true, postalCode: true, country: true, phone: true },
  });

  const thumb = listing.images[0]?.url ?? null;
  const shippoReady = isShippoConfigured();
  const sellerPickupReady = !!(
    listing.seller.pickupLine1 &&
    listing.seller.pickupCity &&
    listing.seller.pickupPostalCode &&
    listing.seller.pickupCountry
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href={`/listings/${listing.slug}`} className="mb-6 inline-flex items-center rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-gray-300 hover:text-gray-700 transition-colors">
        <ChevronLeft size={20} />
      </Link>

      {/* Listing summary */}
      <div className="mb-8 flex items-center gap-4 rounded-xl border border-gray-200 p-4">
        {thumb && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            <Image src={thumb} alt={listing.title} fill sizes="64px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{listing.title}</p>
          <p className="text-sm text-gray-500">
            by{" "}
            <Link href={`/shop/${listing.seller.slug}`} className="hover:underline">
              {listing.seller.shopName}
            </Link>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold tabular-nums text-gray-900">
            {formatPrice(listing.priceAmount * quantity, listing.currency)}
          </p>
          {quantity > 1 && (
            <p className="text-xs text-gray-400">qty {quantity}</p>
          )}
        </div>
      </div>

      <CheckoutFlow
        listingId={listing.id}
        listingSlug={listing.slug}
        isDigital={listing.isDigital}
        priceAmount={listing.priceAmount}
        currency={listing.currency}
        quantity={quantity}
        shippoReady={shippoReady}
        sellerPickupReady={sellerPickupReady}
        savedAddress={savedAddress}
      />
    </main>
  );
}
