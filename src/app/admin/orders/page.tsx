import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { env } from "@/env";
import type { OrderStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Admin: Orders" };

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
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) return notFound();

  // Cap to the 200 most recent orders. Without a limit the function eventually
  // hits the 10s timeout once the orders table grows. Replace with paginated UI
  // before this becomes a problem.
  const ORDERS_CAP = 200;
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: ORDERS_CAP,
    include: {
      buyer: { select: { email: true, name: true } },
      items: {
        select: {
          listingTitle: true,
          quantity: true,
          sellerPayout: true,
          stripeTransferId: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Showing {orders.length}
          {orders.length === ORDERS_CAP ? ` (most recent ${ORDERS_CAP})` : ""}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-24 text-center">
          <p className="text-text-muted">No orders yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="bg-bg-subtle text-xs uppercase tracking-wide text-text-secondary">
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Buyer</th>
                <th className="px-4 py-3 text-left font-medium">Items</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg-card">
              {orders.map((order) => {
                const allReleased = order.items.length > 0 && order.items.every((i) => i.stripeTransferId);
                return (
                  <tr key={order.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-xs text-text-primary hover:underline"
                      >
                        #{order.id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <p className="max-w-[140px] truncate">{order.buyer.name ?? order.buyer.email}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <p className="max-w-[180px] truncate">
                        {order.items.map((i) => `${i.listingTitle} ×${i.quantity}`).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                      {formatPrice(order.totalAmount, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {DATE_FMT.format(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {allReleased ? (
                        <span className="text-emerald-600">Released</span>
                      ) : order.status === "PENDING" || order.status === "CANCELLED" || order.status === "REFUNDED" ? (
                        <span className="text-text-muted">N/A</span>
                      ) : (
                        <span className="text-warning-fg">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
