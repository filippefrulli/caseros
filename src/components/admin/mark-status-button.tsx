"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { OrderStatus } from "@/generated/prisma/client";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  PAID: "Mark as Processing",
  PROCESSING: "Mark as Shipped",
  SHIPPED: "Mark as Delivered",
};

export function MarkStatusButton({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const next = NEXT_STATUS[status];
  if (!next) return null;

  async function advance() {
    setLoading(true);
    await fetch(`/api/admin/orders/${orderId}/status`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={advance}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg bg-btn-neutral px-3 py-1.5 text-sm font-medium text-white hover:bg-btn-neutral-hover disabled:opacity-50 transition-colors"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : null}
      {NEXT_LABEL[status]}
    </button>
  );
}
