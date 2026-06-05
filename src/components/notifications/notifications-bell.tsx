"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  Bell,
  ShoppingBag,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  RotateCcw,
  MessageCircle,
  Star,
  Banknote,
  Store,
} from "lucide-react";
import type { NotificationType } from "@/generated/prisma/client";
import { markAllNotificationsRead } from "@/lib/actions/notifications";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

interface NotificationsBellProps {
  notifications: NotificationItem[];
  unreadCount: number;
}

const TYPE_META: Record<
  NotificationType,
  { icon: React.ComponentType<{ size?: number; className?: string }>; tone: string }
> = {
  ORDER_PLACED: { icon: ShoppingBag, tone: "text-violet-500" },
  ORDER_PAID: { icon: CheckCircle2, tone: "text-green-500" },
  ORDER_SHIPPED: { icon: Truck, tone: "text-blue-500" },
  ORDER_DELIVERED: { icon: PackageCheck, tone: "text-green-600" },
  ORDER_CANCELLED: { icon: XCircle, tone: "text-error" },
  ORDER_REFUNDED: { icon: RotateCcw, tone: "text-amber-500" },
  NEW_MESSAGE: { icon: MessageCircle, tone: "text-blue-500" },
  NEW_REVIEW: { icon: Star, tone: "text-yellow-500" },
  PAYOUT_SENT: { icon: Banknote, tone: "text-green-500" },
  SELLER_APPROVED: { icon: Store, tone: "text-violet-500" },
};

function hrefFor(n: NotificationItem): string | null {
  switch (n.type) {
    case "NEW_MESSAGE":
      return n.entityId ? `/messages/${n.entityId}` : "/messages";
    case "ORDER_PLACED":
    case "NEW_REVIEW":
    case "PAYOUT_SENT":
    case "SELLER_APPROVED":
      return "/seller/dashboard";
    case "ORDER_PAID":
    case "ORDER_SHIPPED":
    case "ORDER_DELIVERED":
    case "ORDER_CANCELLED":
    case "ORDER_REFUNDED":
      return "/account/orders";
    default:
      return null;
  }
}

function relativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString();
}

export function NotificationsBell({ notifications, unreadCount }: NotificationsBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [localUnread, setLocalUnread] = useState(unreadCount);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep optimistic state in sync if server-side count changes (after refresh).
  useEffect(() => {
    setLocalUnread(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && localUnread > 0) {
      setLocalUnread(0);
      startTransition(async () => {
        await markAllNotificationsRead();
        router.refresh();
      });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={localUnread > 0 ? `${localUnread} unread notifications` : "Notifications"}
        className="relative flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <Bell size={20} />
        {localUnread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-500">You're all caught up.</p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              {notifications.map((n) => {
                const meta = TYPE_META[n.type];
                const Icon = meta?.icon ?? Bell;
                const tone = meta?.tone ?? "text-gray-400";
                const href = hrefFor(n);
                const isUnread = !n.readAt;
                const content = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      href ? "hover:bg-gray-50" : ""
                    } ${isUnread ? "bg-violet-50/40" : ""}`}
                  >
                    <Icon size={16} className={`mt-0.5 shrink-0 ${tone}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400">{relativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                );

                return (
                  <li key={n.id}>
                    {href ? (
                      <Link href={href as Route} onClick={() => setOpen(false)}>
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
