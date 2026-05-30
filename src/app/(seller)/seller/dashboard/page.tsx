import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CopyShopLink } from "@/components/seller/copy-shop-link";
import { StripeConnectButton } from "@/components/seller/stripe-connect-button";
import { formatPrice } from "@/lib/utils";
import { Clock, XCircle, AlertCircle, Package } from "lucide-react";
import { GenerateLabelButton } from "@/components/seller/generate-label-button";
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
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-amber-100 text-amber-800",
  SOLD_OUT: "bg-red-100 text-red-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
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

  const [orderCount, revenueAgg, pendingOrders, listings] = await Promise.all([
    prisma.order.count({
      where: {
        items: { some: { sellerId: seller.id } },
        status: { in: ["PROCESSING", "SHIPPED", "DELIVERED"] },
      },
    }),
    prisma.orderItem.aggregate({
      where: {
        sellerId: seller.id,
        order: { status: { in: ["PROCESSING", "SHIPPED", "DELIVERED"] } },
      },
      _sum: { sellerPayout: true },
    }),
    prisma.order.findMany({
      where: {
        items: { some: { sellerId: seller.id } },
        status: { in: ["PROCESSING"] },
      },
      orderBy: { createdAt: "asc" },
      include: {
        shippingAddress: true,
        items: {
          where: { sellerId: seller.id },
          select: {
            listingTitle: true,
            quantity: true,
            unitAmount: true,
            currency: true,
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
    <main className="mx-auto max-w-4xl px-4 py-12">
      {seller.status === "PENDING" && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <Clock size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-900">Your shop is pending review</p>
            <p className="mt-0.5 text-sm text-amber-700">
              We're reviewing your verification materials to confirm you're an EU-based maker.
              This typically takes 1–3 business days. We'll notify you once your shop is approved.
            </p>
          </div>
        </div>
      )}

      {seller.status === "REJECTED" && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold text-red-900">Your shop application was not approved</p>
            <p className="mt-0.5 text-sm text-red-700">
              Unfortunately we were unable to verify your shop at this time. Please contact us if you have questions.
            </p>
          </div>
        </div>
      )}

      {seller.status === "ACTIVE" && !seller.stripeOnboardingDone && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-5">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-violet-500" />
          <div className="flex-1">
            <p className="font-semibold text-violet-900">Connect your Stripe account to get paid</p>
            <p className="mt-0.5 text-sm text-violet-700">
              Buyers can only purchase your listings once your payout account is connected. It takes a few minutes via Stripe.
            </p>
          </div>
          <StripeConnectButton />
        </div>
      )}

      {seller.status === "ACTIVE" && seller.stripeOnboardingDone && !seller.payoutsEnabled && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <Clock size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Payout account under review</p>
            <p className="mt-0.5 text-sm text-amber-700">
              Stripe is verifying your details. This usually takes a few minutes. Buyers will be able to purchase once verification completes.
            </p>
          </div>
          <StripeConnectButton />
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold">{seller.shopName}</h1>
        <div className="mt-4 flex items-center gap-3">
          <CopyShopLink slug={seller.slug} />
          {seller.status === "ACTIVE" && (
            <>
              <Link
                href="/seller/profile"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit profile
              </Link>
              <Link
                href="/seller/listings/new"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
              >
                New listing
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-3xl font-bold">{seller._count.listings}</p>
          <p className="mt-1 text-sm text-gray-500">Listings</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-3xl font-bold">{orderCount}</p>
          <p className="mt-1 text-sm text-gray-500">Orders</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-3xl font-bold">{formatPrice(totalRevenue, "EUR")}</p>
          <p className="mt-1 text-sm text-gray-500">Revenue</p>
        </div>
      </div>

      {/* Orders to fulfil */}
      {pendingOrders.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">Orders to fulfil</h2>
          <ul className="space-y-4">
            {pendingOrders.map((order) => {
              const addr = order.shippingAddress;
              const firstItem = order.items[0];
              const defaultWeight = firstItem?.listing?.weightGrams ?? null;
              const defaultLength = firstItem?.listing?.lengthCm ?? null;
              const defaultWidth = firstItem?.listing?.widthCm ?? null;
              const defaultHeight = firstItem?.listing?.heightCm ?? null;
              return (
                <li key={order.id} className="rounded-xl border border-gray-200 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-400">{DATE_FMT.format(order.createdAt)}</p>
                      <p className="font-mono text-xs text-gray-500 mt-0.5">#{order.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                      Ready to ship
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Items */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Items</p>
                      <ul className="space-y-1">
                        {order.items.map((item, i) => (
                          <li key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{item.listingTitle} × {item.quantity}</span>
                            <span className="tabular-nums text-gray-500">
                              {formatPrice(item.unitAmount * item.quantity, item.currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ship to */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <Package size={11} className="inline mr-1" />
                        Ship to
                      </p>
                      {addr ? (
                        <address className="not-italic text-sm text-gray-700 leading-relaxed">
                          {order.shippingName && <p className="font-medium">{order.shippingName}</p>}
                          <p>{addr.line1}{addr.houseNumber ? ` ${addr.houseNumber}` : ""}</p>
                          {addr.line2 && <p>{addr.line2}</p>}
                          <p>{addr.postalCode} {addr.city}</p>
                          <p>{COUNTRY_FMT.of(addr.country) ?? addr.country}</p>
                        </address>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Address not available yet</p>
                      )}
                    </div>
                  </div>

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
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">You have no listings yet.</p>
          {seller.status === "ACTIVE" && (
            <Link
              href="/seller/listings/new"
              className="mt-4 inline-block text-sm font-medium text-gray-900 underline underline-offset-4"
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
                  className="overflow-hidden rounded-xl border border-gray-200 transition-colors hover:border-gray-300"
                >
                  <Link href={`/seller/listings/${l.slug}/edit`} className="block">
                    <div className="relative aspect-square w-full bg-gray-50">
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
                      <p className="line-clamp-2 text-sm font-medium text-gray-900">{l.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-sm font-semibold tabular-nums text-gray-900">
                          {formatPrice(l.priceAmount, l.currency)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {l.stock > 0 ? `${l.stock} in stock` : "Out of stock"}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
