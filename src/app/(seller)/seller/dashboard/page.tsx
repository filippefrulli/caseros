import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CopyShopLink } from "@/components/seller/copy-shop-link";
import { StripeConnectButton } from "@/components/seller/stripe-connect-button";
import { formatPrice } from "@/lib/utils";
import { Clock, XCircle, AlertCircle, Package, UserPen, Plus, Pencil } from "lucide-react";
import { GenerateLabelButton } from "@/components/seller/generate-label-button";
import { MarkAsSentButton } from "@/components/seller/mark-as-sent-button";
import { isIntegratedShippingEnabled } from "@/lib/platform-settings";
import { DeleteListingButton } from "@/components/seller/delete-listing-button";
import { PublishListingButton } from "@/components/seller/publish-listing-button";
import { isShippoConfigured } from "@/lib/shippo";
import type { ListingStatus } from "@/generated/prisma/client";

const COUNTRY_FMT = new Intl.DisplayNames(["en"], { type: "region" });
const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  SOLD_OUT: "Sold out",
  ARCHIVED: "Archived",
};

const LISTING_STATUS_STYLE: Record<ListingStatus, string> = {
  DRAFT: "bg-bg-subtle text-text-secondary",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-warning text-warning-fg",
  SOLD_OUT: "bg-error-subtle text-error",
  ARCHIVED: "bg-bg-subtle text-text-secondary",
};

export const metadata: Metadata = { title: "Seller Dashboard" };

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/seller/dashboard");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      seller: {
        include: {
          _count: { select: { listings: true } },
        },
      },
    },
  });

  if (!dbUser?.seller) redirect("/seller/onboarding");

  const { seller } = dbUser;

  const selfManagedShipping = !(await isIntegratedShippingEnabled());
  // Self-managed orders await a buyer confirmation after being sent, so keep
  // SHIPPED ones visible to the seller; integrated orders leave the list once
  // a label is generated.
  const fulfilStatuses = selfManagedShipping ? (["PROCESSING", "SHIPPED"] as const) : (["PROCESSING"] as const);

  const [orderCount, revenueAgg, pendingOrders, listings] = await Promise.all([
    prisma.order.count({
      where: {
        items: { some: { sellerId: seller.id } },
        status: { in: ["PROCESSING", "SHIPPED", "DELIVERED"] },
      },
    }),
    prisma.orderItem.aggregate({
      // Revenue = payouts actually released to the seller. Paid-but-not-yet-
      // released orders (e.g. awaiting the buyer's confirmation of receipt) are
      // not counted until the transfer goes out.
      where: {
        sellerId: seller.id,
        payoutReleasedAt: { not: null },
      },
      _sum: { sellerPayout: true },
    }),
    prisma.order.findMany({
      where: {
        items: { some: { sellerId: seller.id } },
        status: { in: [...fulfilStatuses] },
      },
      orderBy: { createdAt: "asc" },
      include: {
        items: {
          where: { sellerId: seller.id },
          select: {
            listingTitle: true,
            quantity: true,
            unitAmount: true,
            listing: {
              select: { weightGrams: true, lengthCm: true, widthCm: true, heightCm: true },
            },
          },
        },
      },
    }),
    prisma.listing.findMany({
      where: { sellerId: seller.id, deletedAt: null },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        priceAmount: true,
        currency: true,
        stock: true,
        status: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
    }),
  ]);

  const totalRevenue = revenueAgg._sum.sellerPayout ?? 0;
  const sendcloudConfigured = isShippoConfigured();
  const sellerPickupReady = !!(seller.pickupLine1 && seller.pickupCity && seller.pickupPostalCode && seller.pickupCountry && seller.pickupPhone);

  return (
    <main className="mx-auto max-w-4xl px-4 pt-6 pb-12">
      {seller.status === "PENDING" && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-warning bg-warning-subtle p-5">
          <Clock size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-warning-fg">Your shop is pending review</p>
            <p className="mt-0.5 text-sm text-warning-fg">
              We're reviewing your verification materials to confirm you're an EU-based maker.
              This typically takes 1–3 business days. We'll notify you once your shop is approved.
            </p>
          </div>
        </div>
      )}

      {seller.status === "REJECTED" && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-error bg-error-subtle p-5">
          <XCircle size={18} className="mt-0.5 shrink-0 text-error" />
          <div>
            <p className="font-semibold text-error">Your shop application was not approved</p>
            <p className="mt-0.5 text-sm text-error">
              Unfortunately we were unable to verify your shop at this time. Please contact us if you have questions.
            </p>
          </div>
        </div>
      )}

      {seller.status === "ACTIVE" && !seller.stripeOnboardingDone && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-warning bg-warning-subtle p-5">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-warning-fg" />
          <div className="flex-1">
            <p className="font-semibold text-text-primary">Connect your Stripe account to get paid</p>
            <p className="mt-0.5 text-sm text-warning-fg">
              Buyers can only purchase your listings once your payout account is connected. It takes a few minutes via Stripe.
            </p>
          </div>
          <StripeConnectButton />
        </div>
      )}

      {seller.status === "ACTIVE" && seller.stripeOnboardingDone && !seller.payoutsEnabled && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-warning bg-warning-subtle p-5">
          <Clock size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="font-semibold text-warning-fg">Payout account under review</p>
            <p className="mt-0.5 text-sm text-warning-fg">
              Stripe needs to verify your details. Ensure you've completed all required steps in Stripe. Buyers will be able to purchase once verification completes.
            </p>
          </div>
          <StripeConnectButton />
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold">{seller.shopName}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CopyShopLink slug={seller.slug} />
          {seller.status === "ACTIVE" && (
            <>
              <Link
                href="/seller/profile"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors"
              >
                <UserPen size={15} />
                Edit profile
              </Link>
              <Link
                href="/seller/listings/new"
                className="flex items-center gap-2 rounded-lg bg-btn-neutral px-4 py-2 text-sm font-medium text-white hover:bg-btn-neutral-hover transition-colors"
              >
                <Plus size={15} />
                New listing
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-10 sm:grid-cols-4">
        <div className="rounded-xl border border-border p-5">
          <p className="text-2xl font-bold sm:text-3xl">{seller._count.listings}</p>
          <p className="mt-1 text-sm text-text-secondary">Listings</p>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="text-2xl font-bold sm:text-3xl">{orderCount}</p>
          <p className="mt-1 text-sm text-text-secondary">Orders</p>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="text-2xl font-bold sm:text-3xl">{formatPrice(totalRevenue, "EUR")}</p>
          <p className="mt-1 text-sm text-text-secondary">Revenue</p>
        </div>
      </div>

      {/* Orders to fulfil */}
      {pendingOrders.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">Orders to fulfil</h2>
          <ul className="space-y-4">
            {pendingOrders.map((order) => {
              const firstItem = order.items[0];
              const defaultWeight = firstItem?.listing?.weightGrams ?? null;
              const defaultLength = firstItem?.listing?.lengthCm ?? null;
              const defaultWidth = firstItem?.listing?.widthCm ?? null;
              const defaultHeight = firstItem?.listing?.heightCm ?? null;
              return (
                <li key={order.id} className="rounded-xl border border-border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs text-text-muted">{DATE_FMT.format(order.createdAt)}</p>
                      <p className="font-mono text-xs text-text-secondary mt-0.5">#{order.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                      Ready to ship
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Items */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Items</p>
                      <ul className="space-y-1">
                        {order.items.map((item, i) => (
                          <li key={i} className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">{item.listingTitle} × {item.quantity}</span>
                            <span className="tabular-nums text-text-secondary">
                              {formatPrice(item.unitAmount * item.quantity, order.currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ship to */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        <Package size={11} className="inline mr-1" />
                        Ship to
                      </p>
                      {order.shippingLine1 ? (
                        <address className="not-italic text-sm text-text-secondary leading-relaxed">
                          {order.shippingName && <p className="font-medium">{order.shippingName}</p>}
                          <p>{order.shippingLine1}{order.shippingHouseNumber ? ` ${order.shippingHouseNumber}` : ""}</p>
                          {order.shippingLine2 && <p>{order.shippingLine2}</p>}
                          <p>{order.shippingPostalCode} {order.shippingCity}</p>
                          {order.shippingCountry && <p>{COUNTRY_FMT.of(order.shippingCountry) ?? order.shippingCountry}</p>}
                        </address>
                      ) : (
                        <p className="text-sm text-text-muted italic">Address not available yet</p>
                      )}
                    </div>
                  </div>

                  {selfManagedShipping ? (
                    <MarkAsSentButton orderId={order.id} status={order.status} />
                  ) : (
                    <GenerateLabelButton
                      orderId={order.id}
                      status={order.status}
                      defaultWeightGrams={defaultWeight}
                      defaultLengthCm={defaultLength}
                      defaultWidthCm={defaultWidth}
                      defaultHeightCm={defaultHeight}
                      trackingCode={order.trackingCode ?? null}
                      trackingUrl={order.trackingUrl ?? null}
                      sendcloudConfigured={sendcloudConfigured}
                      sellerPickupReady={sellerPickupReady}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-12 text-center">
          <p className="text-text-secondary">You have no listings yet.</p>
          {seller.status === "ACTIVE" && (
            <Link
              href="/seller/listings/new"
              className="mt-4 inline-block text-sm font-medium text-text-primary underline underline-offset-4"
            >
              Create your first listing
            </Link>
          )}
        </div>
      ) : (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Your listings</h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => {
              const thumb = l.images[0]?.url;
              return (
                <li
                  key={l.id}
                  className="overflow-hidden rounded-xl border border-border transition-colors hover:border-border-strong"
                >
                  <Link href={`/listings/${l.slug}`} className="block">
                    <div className="relative aspect-square w-full bg-bg-subtle">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={l.title}
                          fill
                          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      ) : null}
                      <span
                        className={`absolute left-2 top-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${LISTING_STATUS_STYLE[l.status]}`}
                      >
                        {LISTING_STATUS_LABEL[l.status]}
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="line-clamp-2 min-h-10 text-sm font-medium text-text-primary" title={l.title}>{l.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-sm font-semibold tabular-nums text-text-primary">
                          {formatPrice(l.priceAmount, l.currency)}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {l.stock > 0 ? `${l.stock} in stock` : "Out of stock"}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <div className="border-t border-border px-4 py-1 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/seller/listings/${l.slug}/edit`}
                        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors py-2 px-1"
                      >
                        <Pencil size={13} />
                        Edit
                      </Link>
                      {l.status === "DRAFT" && (
                        <PublishListingButton listingId={l.id} />
                      )}
                    </div>
                    <DeleteListingButton listingId={l.id} listingTitle={l.title} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
