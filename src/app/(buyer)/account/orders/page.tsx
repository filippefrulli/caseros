import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/client";
import { ConfirmReceivedButton } from "@/components/buyer/confirm-received-button";

export const metadata: Metadata = { title: "My Orders" };

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-bg-subtle text-text-secondary",
  PAID: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-violet-100 text-violet-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-error-subtle text-error",
  REFUNDED: "bg-warning text-warning-fg",
};

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/orders");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/account");

  const orders = await prisma.order.findMany({
    where: { buyerId: dbUser.id, status: { not: "PENDING" } },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          listing: {
            select: {
              slug: true,
              images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
              seller: { select: { shopName: true, slug: true } },
            },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-12">
      <div className="mb-6">
        <Link href="/account" className="inline-flex items-center rounded-lg border border-border p-2 text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors">
          <ChevronLeft size={25} />
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-center">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
          <p className="text-text-muted">You have no orders yet.</p>
          <Link href="/" className="mt-3 text-sm font-medium text-text-primary underline underline-offset-4">
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            // Total only adds information when there's more than one item or a
            // shipping charge, otherwise it just repeats the single item's price.
            const showTotal = order.items.length > 1 || order.shippingAmount > 0;
            return (
              <li key={order.id} className="rounded-xl border border-border p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-text-secondary">
                      #{order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">{DATE_FMT.format(order.createdAt)}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[order.status]}`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>

                <ul className="mt-3 space-y-3 border-t border-border pt-3">
                  {order.items.map((item) => {
                    const thumb = item.listing?.images?.[0]?.url ?? item.listingImageUrl;
                    return (
                      <li key={item.id} className="flex items-center gap-3">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt={item.listingTitle}
                            width={56}
                            height={56}
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-lg bg-bg-subtle" />
                        )}
                        <div className="min-w-0 flex-1">
                          {item.listing?.slug ? (
                            <Link
                              href={`/listings/${item.listing.slug}`}
                              className="text-sm font-medium text-text-primary hover:underline"
                            >
                              {item.listingTitle}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-text-primary">
                              {item.listingTitle}
                            </span>
                          )}
                          <p className="mt-0.5 text-xs text-text-secondary">
                            {item.listing?.seller?.shopName && (
                              <>
                                <Link
                                  href={`/shop/${item.listing.seller.slug}`}
                                  className="hover:underline"
                                >
                                  {item.listing.seller.shopName}
                                </Link>
                                {" · "}
                              </>
                            )}
                            Qty {item.quantity}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-medium tabular-nums text-text-primary">
                          {formatPrice(item.unitAmount * item.quantity, order.currency)}
                        </p>
                      </li>
                    );
                  })}
                </ul>

                {(showTotal || order.status === "SHIPPED") && (
                  <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
                    {showTotal ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-text-secondary">Total</span>
                        <span className="text-base font-semibold tabular-nums text-text-primary">
                          {formatPrice(order.totalAmount, order.currency)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary">Received your order?</p>
                    )}
                    {order.status === "SHIPPED" && <ConfirmReceivedButton orderId={order.id} />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
