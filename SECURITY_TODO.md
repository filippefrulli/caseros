## 5. Verify Stripe Connect platform fee model

`src/app/api/checkout/route.ts` reads `seller.commissionRate` (default 0.05)
and computes `sellerPayout = floor(itemsTotal * (1 - commissionRate))`. The
admin payout-release route then transfers `sellerPayout` to the connected
account via `stripe.transfers.create`.

Confirm in Stripe Dashboard:

1. Platform → Connect → Settings → **fees collected by platform** matches
   "application" (since our code sets `responsibilities.fees_collector =
   "application"` and `losses_collector = "application"`).
2. Connected accounts are created with `dashboard: "express"` — confirm this
   is the experience you want sellers to see.
3. Test mode → run one full flow with a test card, verify the payout amount
   on the connected account matches `sellerPayout` from the order item.

**Open question for legal/ops:** what happens on a refund after payout? The
`charge.refunded` webhook updates `OrderItem.refundedAmount` but does **not**
reverse the transfer. If the transfer already went out, the platform eats
the refund unless you also call `stripe.transfers.createReversal`. The
admin refund route does this — verify it covers all refund paths (Stripe
Dashboard refunds also fire the same webhook).

---

## 7. Implement GDPR data export + account deletion

`src/app/(legal)/legal/privacy/page.tsx:128` enumerates GDPR rights (access,
rectification, erasure, portability) but there is no in-app path to exercise
them. Currently users would have to email you and you'd run SQL by hand —
acceptable at very low volume, not at scale.

**Minimum acceptable for launch** (manual, but documented):

1. Privacy policy must list an email address that requests go to.
2. Have an internal runbook (in `docs/` or Notion) describing:
   - How to assemble an export: union of `User`, `SellerProfile`, `SellerKyc`,
     `Address`, `Order` (where buyer or seller), `OrderItem`, `Message`,
     `Review`, `Favorite`, `Notification`.
   - How to delete: which rows cascade vs. require manual handling. Note that
     `Order` has financial-record retention obligations — under EU tax law
     you generally **cannot** delete completed orders for 7–10 years; document
     this in the privacy policy ("we anonymise rather than delete invoices").

**Better, post-launch:**

- `/account/data-export` server action that produces a JSON download.
- `/account/delete` server action that:
  - Anonymises `User.email`, `User.name`, `User.avatarUrl`.
  - Deletes `Address`, `Favorite`, `Notification`.
  - Hard-deletes `Message` bodies but keeps conversation rows.
  - Leaves `Order`/`OrderItem` intact (financial retention) but unlinks
    personal data.
  - Soft-deletes `SellerProfile` and `Listing`.
- Both flows emit an audit log row for legal traceability.

---

## 9. Rate-limit user-facing endpoints

No endpoint has rate limiting. Realistic attacks:

- **Sign-in brute force** — Supabase does some throttling but app-level
  limits help.
- **Sign-up flood** — fake accounts, spam reviews.
- **Message spam** — `/api/messages` lets any authed buyer DM any seller.
- **Shippo rate scraping** — `/api/shipping-rates` calls Shippo per request;
  unauthenticated callers were the worst case (fixed), but an authed
  attacker can still rack up bills.
- **Checkout enumeration** — repeated POSTs probe listing/seller state.

**Recommended stack:** Upstash Redis + `@upstash/ratelimit` (works on Edge and
Node runtimes, no separate infra).

```bash
npm i @upstash/ratelimit @upstash/redis
```

```ts
// src/lib/ratelimit.ts
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),  // 5 attempts per minute
  prefix: "rl:auth",
});

export const messageLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),  // 20 messages per hour
  prefix: "rl:msg",
});

export const shippingRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  prefix: "rl:ship",
});

export const checkoutLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  prefix: "rl:checkout",
});
```

**Apply at the top of each route**, keyed by either user ID (preferred for
authed routes) or IP via `req.headers.get("x-forwarded-for")` (auth routes).
On hit, return `429 Too Many Requests` with a `Retry-After` header.

**Vercel env:** add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
(Upstash dashboard provides these). Add to `src/env.ts` server schema.

---

## Pre-launch checklist

Run through this list before flipping the marketing site live:

- [ ] `CRON_SECRET` set in Vercel; cron returns 401 without header (#1)
- [ ] All Storage buckets have MIME + size limits + path-prefix RLS (#2)
- [ ] RLS enabled on every `public` schema table (#3)
- [ ] Supabase Auth "Confirm email" = ON; redirect URLs locked to prod (#4)
- [ ] One end-to-end test order with real card produces correct payout (#5)
- [ ] `RESEND_FROM` set to verified domain; SPF/DKIM/DMARC green (#6)
- [ ] Privacy policy lists deletion/export request email; internal runbook
      exists (#7)
- [ ] CSP report-only deployed and exercised (#8)
- [ ] Rate limiting on auth, messages, checkout, shipping-rates (#9)
- [ ] Re-run `git diff main` and spot-check the security commits one last
      time before merging
