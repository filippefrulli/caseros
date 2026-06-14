"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Users, Settings, Mail } from "lucide-react";

const links: { href: Route; label: string; icon: React.ElementType; exact: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { href: "/admin/sellers", label: "Sellers", icon: Users, exact: false },
  { href: "/admin/emails", label: "Email tester", icon: Mail, exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
];

export function AdminNav({ pendingSellers }: { pendingSellers: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-btn-neutral text-white"
                : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
            }`}
          >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {label === "Sellers" && pendingSellers > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${active ? "bg-bg-card text-text-primary" : "bg-warning text-warning-fg"}`}>
                {pendingSellers}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
