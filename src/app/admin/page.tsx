import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { ShoppingBag, Users, Settings, AlertCircle, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboardPage() {
  const [orderStats, pendingSellerCount, activeSellerCount] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.sellerProfile.count({ where: { status: "PENDING" } }),
    prisma.sellerProfile.count({ where: { status: "ACTIVE" } }),
  ]);

  const byStatus = Object.fromEntries(
    orderStats.map((s) => [s.status, { count: s._count.id, sum: Number(s._sum.totalAmount ?? 0) }]),
  );

  const totalOrders = orderStats.reduce((n, s) => n + s._count.id, 0);
  const needsAction = (byStatus.PAID?.count ?? 0) + (byStatus.PROCESSING?.count ?? 0);
  const deliveredRevenue = byStatus.DELIVERED?.sum ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Platform overview</p>

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total orders" value={String(totalOrders)} icon={ShoppingBag} />
        <StatCard
          label="Need action"
          value={String(needsAction)}
          icon={AlertCircle}
          highlight={needsAction > 0}
        />
        <StatCard
          label="Active sellers"
          value={String(activeSellerCount)}
          icon={Users}
        />
        <StatCard
          label="Delivered revenue"
          value={formatPrice(deliveredRevenue, "EUR")}
          icon={TrendingUp}
        />
      </div>

      {/* Quick links */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <NavCard
          href="/admin/orders"
          icon={ShoppingBag}
          title="Orders"
          description="View and manage all orders, update statuses, release payouts, and issue refunds."
          badge={needsAction > 0 ? `${needsAction} need action` : undefined}
          badgeVariant="warning"
        />
        <NavCard
          href="/admin/sellers"
          icon={Users}
          title="Sellers"
          description="Review pending applications, approve or reject sellers, and adjust commission rates."
          badge={pendingSellerCount > 0 ? `${pendingSellerCount} pending` : undefined}
          badgeVariant="warning"
        />
        <NavCard
          href="/admin/settings"
          icon={Settings}
          title="Settings"
          description="Configure platform-wide feature flags and operational settings."
        />
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
      <Icon size={16} className={`mb-3 ${highlight ? "text-amber-500" : "text-gray-400"}`} />
      <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-amber-700" : "text-gray-900"}`}>
        {value}
      </p>
      <p className={`mt-0.5 text-xs ${highlight ? "text-amber-600" : "text-gray-500"}`}>{label}</p>
    </div>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
  badgeVariant = "neutral",
}: {
  href: Route;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "warning" | "neutral";
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 transition-colors group-hover:bg-gray-900 group-hover:text-white text-gray-600">
          <Icon size={18} />
        </div>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            badgeVariant === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
          }`}>
            {badge}
          </span>
        )}
      </div>
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
    </Link>
  );
}
