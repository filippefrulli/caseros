import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { isShippoConfigured } from "@/lib/shippo";
import { isIntegratedShippingEnabled } from "@/lib/platform-settings";
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
          shipsToCountries: true,
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

  const savedAddresses = dbUser
    ? await prisma.address.findMany({
        where: { userId: dbUser.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: { id: true, name: true, line1: true, houseNumber: true, line2: true, city: true, postalCode: true, country: true, phone: true, isDefault: true },
      })
    : [];

  const thumb = listing.images[0]?.url ?? null;
  const selfManagedShipping = !(await isIntegratedShippingEnabled());
  const shippoReady = isShippoConfigured();
  const sellerPickupReady = !!(
    listing.seller.pickupLine1 &&
    listing.seller.pickupCity &&
    listing.seller.pickupPostalCode &&
    listing.seller.pickupCountry
  );

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-12">
      <Link href={`/listings/${listing.slug}`} className="mb-6 inline-flex items-center rounded-lg border border-border p-2 text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors">
        <ChevronLeft size={25} />
      </Link>

      {/* Listing summary */}
      <div className="mb-8 flex items-center gap-4 rounded-xl border border-border p-4">
        {thumb && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-bg-subtle">
            <Image src={thumb} alt={listing.title} fill sizes="64px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-text-primary">{listing.title}</p>
          <p className="text-sm text-text-secondary">
            by{" "}
            <Link href={`/shop/${listing.seller.slug}`} className="hover:underline">
              {listing.seller.shopName}
            </Link>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold tabular-nums text-text-primary">
            {formatPrice(listing.priceAmount * quantity, listing.currency)}
          </p>
          {quantity > 1 && (
            <p className="text-xs text-text-muted">qty {quantity}</p>
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
        savedAddresses={savedAddresses}
        selfManagedShipping={selfManagedShipping}
        shipsToCountries={listing.seller.shipsToCountries}
      />
    </main>
  );
}
