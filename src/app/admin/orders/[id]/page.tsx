import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { env } from "@/env";
import { MarkStatusButton } from "@/components/admin/mark-status-button";
import { ReleasePayoutButton } from "@/components/admin/release-payout-button";
import { RefundButton } from "@/components/admin/refund-button";
import type { Route } from "next";
import type { OrderStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Admin: Order detail" };

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
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
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) return notFound();

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      buyer: { select: { email: true, name: true } },
      items: {
        include: {
          listing: {
            select: {
              slug: true,
              images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });
  if (!order) return notFound();

  const sellerIds = [...new Set(order.items.map((i) => i.sellerId))];
  const sellers = await prisma.sellerProfile.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, shopName: true, slug: true },
  });
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));

  const allPayoutsReleased =
    order.items.length > 0 && order.items.every((i) => i.stripeTransferId);
  const canRelease =
    order.status === "DELIVERED" && !allPayoutsReleased && !!order.stripeChargeId;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/orders" className="inline-flex items-center rounded-lg border border-border p-1.5 text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <span className="text-text-muted">/</span>
        <span className="font-mono text-sm text-text-secondary">#{order.id.slice(-8).toUpperCase()}</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Order detail</h1>
          <p className="mt-1 text-sm text-text-secondary">{DATE_FMT.format(order.createdAt)}</p>
          <p className="mt-0.5 font-mono text-xs text-text-muted">{order.id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Buyer */}
      <section className="mb-6 rounded-xl border border-border p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Buyer</h2>
        <p className="text-sm text-text-primary">{order.buyer.name ?? "-"}</p>
        <p className="text-sm text-text-secondary">{order.buyer.email}</p>
      </section>

      {/* Items */}
      <section className="mb-6 rounded-xl border border-border p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-secondary">Items</h2>
        <ul className="space-y-4">
          {order.items.map((item) => {
            const thumb = item.listing?.images?.[0]?.url ?? item.listingImageUrl;
            const seller = sellerMap.get(item.sellerId);
            return (
              <li key={item.id} className="flex items-start gap-3">
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
                  <p className="text-sm font-medium text-text-primary">{item.listingTitle}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Qty {item.quantity} ·{" "}
                    {seller ? (
                      <Link
                        href={`/shops/${seller.slug}` as Route}
                        className="hover:underline"
                        target="_blank"
                      >
                        {seller.shopName}
                      </Link>
                    ) : (
                      "Unknown seller"
                    )}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Payout: {formatPrice(item.sellerPayout, order.currency)}
                    {item.stripeTransferId ? (
                      <span className="ml-2 text-emerald-600">
                        ✓ Released{item.payoutReleasedAt ? ` ${DATE_FMT.format(item.payoutReleasedAt)}` : ""}
                      </span>
                    ) : null}
                  </p>
                </div>
                <p className="shrink-0 text-sm tabular-nums text-text-secondary">
                  {formatPrice(item.unitAmount * item.quantity, order.currency)}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-text-secondary">Total</p>
          <p className="text-sm font-semibold tabular-nums text-text-primary">
            {formatPrice(order.totalAmount, order.currency)}
          </p>
        </div>
      </section>

      {/* Stripe IDs */}
      <section className="mb-6 rounded-xl border border-border p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Stripe</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-xs">
          <dt className="text-text-muted">Payment Intent</dt>
          <dd className="font-mono text-text-secondary truncate">{order.stripePaymentIntentId ?? "-"}</dd>
          <dt className="text-text-muted">Charge</dt>
          <dd className="font-mono text-text-secondary truncate">{order.stripeChargeId ?? "-"}</dd>
          <dt className="text-text-muted">Session</dt>
          <dd className="font-mono text-text-secondary truncate">{order.checkoutSessionId ?? "-"}</dd>
        </dl>
      </section>

      {/* Actions */}
      {(order.status !== "CANCELLED" && order.status !== "REFUNDED") && (
        <section className="rounded-xl border border-border p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-secondary">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <MarkStatusButton orderId={order.id} status={order.status} />
            {canRelease && <ReleasePayoutButton orderId={order.id} />}
            {allPayoutsReleased && (
              <span className="flex items-center text-sm text-emerald-600">✓ All payouts released</span>
            )}
            {order.status !== "PENDING" && (
              <RefundButton orderId={order.id} totalAmount={order.totalAmount} />
            )}
          </div>
        </section>
      )}
    </main>
  );
}
