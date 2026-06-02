import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/client";

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
  PENDING: "bg-gray-100 text-gray-700",
  PAID: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-violet-100 text-violet-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-amber-100 text-amber-800",
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
            },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 pb-12">
      <div className="mb-6">
        <Link href="/account" className="inline-flex items-center rounded-lg border border-gray-200 p-2 text-gray-400 hover:border-gray-300 hover:text-gray-700 transition-colors">
          <ChevronLeft size={25} />
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-center">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-24 text-center">
          <p className="text-gray-400">You have no orders yet.</p>
          <Link href="/" className="mt-3 text-sm font-medium text-gray-900 underline underline-offset-4">
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="space-y-5">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-gray-200 p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {DATE_FMT.format(order.createdAt)}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-gray-400 truncate max-w-[10rem]">{order.id}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[order.status]}`}
                >
                  {STATUS_LABEL[order.status]}
                </span>
              </div>

              <ul className="space-y-3 border-t border-gray-100 pt-4">
                {order.items.map((item) => {
                  const thumb = item.listing?.images?.[0]?.url ?? item.listingImageUrl;
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
                        <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        {item.listing?.slug ? (
                          <Link
                            href={`/listings/${item.listing.slug}`}
                            className="text-sm font-medium text-gray-900 hover:underline"
                          >
                            {item.listingTitle}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {item.listingTitle}
                          </span>
                        )}
                        <p className="mt-0.5 text-xs text-gray-500">Qty {item.quantity}</p>
                      </div>
                      <p className="shrink-0 text-sm tabular-nums text-gray-700">
                        {formatPrice(item.unitAmount * item.quantity, item.currency)}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-sm font-semibold tabular-nums text-gray-900">
                  {formatPrice(order.totalAmount, order.currency)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
