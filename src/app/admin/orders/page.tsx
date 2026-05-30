import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { env } from "@/env";
import type { OrderStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Admin — Orders" };

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
  PENDING: "bg-gray-100 text-gray-600",
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
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== env.ADMIN_EMAIL) return notFound();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">{orders.length} total</p>
        </div>
        <Link href="/admin/sellers" className="inline-flex items-center rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-gray-300 hover:text-gray-700 transition-colors">
          <ChevronLeft size={20} />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-24 text-center">
          <p className="text-gray-400">No orders yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Buyer</th>
                <th className="px-4 py-3 text-left font-medium">Items</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.map((order) => {
                const allReleased = order.items.length > 0 && order.items.every((i) => i.stripeTransferId);
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-xs text-gray-900 hover:underline"
                      >
                        #{order.id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p className="max-w-[140px] truncate">{order.buyer.name ?? order.buyer.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p className="max-w-[180px] truncate">
                        {order.items.map((i) => `${i.listingTitle} ×${i.quantity}`).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {formatPrice(order.totalAmount, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {DATE_FMT.format(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {allReleased ? (
                        <span className="text-emerald-600">Released</span>
                      ) : order.status === "PENDING" || order.status === "CANCELLED" || order.status === "REFUNDED" ? (
                        <span className="text-gray-400">N/A</span>
                      ) : (
                        <span className="text-amber-600">Pending</span>
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
