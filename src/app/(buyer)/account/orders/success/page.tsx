import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { CheckCircle2, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Order confirmed" };

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/orders");
  if (!sessionId) redirect("/account/orders");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/account/orders");

  const order = await prisma.order.findUnique({
    where: { checkoutSessionId: sessionId },
    include: {
      items: { include: { listing: { select: { slug: true } } } },
    },
  });

  // Order belongs to someone else, don't leak. Treat as 404.
  if (!order || order.buyerId !== dbUser.id) redirect("/account/orders");

  // Webhook may not have fired yet (or arrived first as checkout.session.completed
  // without payment_intent.succeeded). Show a friendly pending state.
  const isPending = order.status === "PENDING";

  return (
    <main className="mx-auto max-w-xl px-4 pt-6 pb-12">
      {isPending ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning bg-warning-subtle p-5">
          <Clock size={20} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-warning-fg">Confirming your payment…</p>
            <p className="mt-0.5 text-sm text-warning-fg">
              Your payment was submitted. We're waiting for Stripe to confirm, refresh this page
              in a moment.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-5">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-500" />
          <div>
            <p className="font-semibold text-green-900">Order confirmed</p>
            <p className="mt-0.5 text-sm text-green-700">
              Thanks for your purchase. The seller has been notified and will arrange shipping.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border p-5">
        <p className="text-xs uppercase tracking-wide text-text-secondary">Order</p>
        <p className="mt-0.5 font-mono text-sm text-text-secondary">{order.id}</p>

        <div className="mt-5 space-y-3 border-t border-border pt-5">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {item.listing?.slug ? (
                  <Link
                    href={`/listings/${item.listing.slug}`}
                    className="text-sm font-medium text-text-primary hover:underline"
                  >
                    {item.listingTitle}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-text-primary">{item.listingTitle}</span>
                )}
                <p className="mt-0.5 text-xs text-text-secondary">Qty {item.quantity}</p>
              </div>
              <p className="text-sm tabular-nums text-text-secondary">
                {formatPrice(item.unitAmount * item.quantity, order.currency)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
          <p className="text-sm font-medium text-text-primary">Total</p>
          <p className="text-sm font-semibold tabular-nums text-text-primary">
            {formatPrice(order.totalAmount, order.currency)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/account/orders"
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors"
        >
          My orders
        </Link>
        <Link
          href="/"
          className="flex-1 rounded-lg bg-btn-neutral px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-btn-neutral-hover transition-colors"
        >
          Keep shopping
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-text-muted">
        Something wrong with your order?{" "}
        <Link href="/legal/support" className="underline hover:text-text-secondary transition-colors">
          Contact support
        </Link>
      </p>
    </main>
  );
}
