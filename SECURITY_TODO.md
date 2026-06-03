# Pre-launch security TODOs

Items below cannot be solved in code alone — they require dashboard config,
operational decisions, or new dependencies. Ordered by blocking severity.

---

## 1. Set `CRON_SECRET` in Vercel — **BLOCKS DEPLOY**

`src/env.ts` now requires `CRON_SECRET` (min 16 chars). Without it, the app
will throw at startup and every page returns 500.

**Steps**

1. Generate a secret:
   ```bash
   openssl rand -hex 32
   ```
2. Add it to Vercel: Project → Settings → Environment Variables → add
   `CRON_SECRET` for **Production** (and Preview if you cron-test there).
3. Update Vercel cron headers — Vercel Cron does not automatically attach the
   bearer token; configure it explicitly. In `vercel.json`, Vercel injects an
   `Authorization: Bearer <CRON_SECRET>` header automatically **only** if the
   secret is in the project env. Verify by checking one cron invocation log
   after deploy.
4. Locally: add `CRON_SECRET=<value>` to `.env.local` so `npm run dev` works.

**Verification:** hit `/api/cron/cleanup-pending-orders` without the header
locally — must return 401. With the correct header — must return 200.

---

## 2. Lock down Supabase Storage buckets

Uploads currently go through `src/lib/upload.ts` using the **browser** Supabase
client. The browser has full freedom over filename, MIME type, and size unless
the bucket itself restricts them. Without these restrictions a malicious user
can:

- Upload an HTML file to a public bucket and get a `*.supabase.co` URL that
  executes scripts in the browser (XSS on the Supabase origin, but with reach
  via embeds).
- Upload multi-GB files to exhaust storage quota.
- Upload to another user's path prefix.

**For each bucket** (`listing-images`, `listing-videos`, and any avatar bucket):

1. **Allowed MIME types** — Storage → bucket → Configuration:
   - `listing-images`: `image/jpeg, image/png, image/webp`
   - `listing-videos`: `video/mp4, video/quicktime`
   - avatars: `image/jpeg, image/png, image/webp`
2. **Max file size** per bucket, e.g. 10 MB for images, 200 MB for videos.
3. **RLS policies** — Storage → Policies. For each bucket the INSERT/UPDATE
   policy must pin the path prefix to the authenticated user:
   ```sql
   (auth.uid()::text = (storage.foldername(name))[1])
   ```
   This matches how `upload.ts` builds the path (`${userId}/<uuid>.<ext>`).
4. **SELECT policy** — public buckets can stay public. Private buckets (KYC
   videos, anything sensitive) must require auth and ideally restrict to the
   owner.

**Verification:** in Supabase Studio's SQL editor, simulate an authenticated
session for one user and attempt to upload into another user's prefix — must
fail.

---

## 3. Enable RLS on every public-schema table

Even though the app uses Prisma with the service-role key, the **anon key is
shipped to every browser**. If anyone ever queries Supabase directly with the
anon key (intentionally or via a compromised dependency), RLS is the only line
of defence.

**Steps**

1. In Supabase Studio → Authentication → Policies, list tables where RLS is
   OFF. Every table in the `public` schema should have RLS **enabled**.
2. For tables Prisma writes to but no client should query directly
   (e.g. `Order`, `StripeWebhookEvent`, `Notification`, `SellerKyc`), enable
   RLS with **no policies** — service role bypasses RLS, anon key gets nothing.
3. For tables the browser SDK does need to read (none today, but be explicit),
   add a `select` policy.

**Verification:**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

Should return zero rows.

---

## 4. Require email confirmation in Supabase Auth

`src/lib/actions/auth.ts:88` comment says "Email confirmation disabled — user
is immediately active." That's a development shortcut that must be reversed
for production:

1. Supabase Studio → Authentication → Settings → **Confirm email = ON**.
2. Set the **Site URL** and **Redirect URLs** to your production domain only
   (no localhost, no preview wildcards). Otherwise the email confirmation link
   becomes an open-redirect surface back to attacker-controlled hosts.
3. Configure the confirmation email template (subject, body, branding).
4. The `signUpWithEmail` action already returns the right "check your inbox"
   message — no code change needed once the toggle flips.

**Verification:** sign up with a new email — must not be able to sign in until
the confirmation link is clicked.

---

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

## 6. Move Resend off the sandbox sender

`src/lib/email.ts:14` defaults `FROM` to `caseros <onboarding@resend.dev>`.
That sender only delivers to the **Resend account owner's email**. Real
buyers and sellers will never receive transactional emails until this is
fixed.

**Steps**

1. Resend Dashboard → Domains → add your production domain (e.g.
   `caseros.com` or a `mail.` subdomain).
2. Add the DNS records Resend gives you:
   - **SPF**: `TXT @  "v=spf1 include:_spf.resend.com ~all"`
   - **DKIM**: 3 CNAME records (`resend._domainkey.*`, etc.) — Resend shows
     the exact records.
   - **DMARC**: `TXT _dmarc  "v=DMARC1; p=quarantine; rua=mailto:postmaster@yourdomain"`
     Start with `p=quarantine`, move to `p=reject` after 2–4 weeks of clean
     reports.
3. Wait for Resend to mark the domain "Verified".
4. Set Vercel env `RESEND_FROM=Caseros <orders@yourdomain.com>` (or whatever
   address you choose).
5. Test: trigger an order confirmation to a non-Resend-owner address — must
   land in the inbox, not spam.

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

## 8. Add a Content-Security-Policy header

`next.config.ts` ships baseline security headers but intentionally omits CSP
because Stripe + Supabase + Resend each need allowlisted origins and a
misconfigured CSP silently breaks payments.

**Proposed starting policy** (test in `Content-Security-Policy-Report-Only`
first for at least a week):

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://*.stripe.com;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.resend.com https://api.goshippo.com;
frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com;
form-action 'self' https://checkout.stripe.com;
frame-ancestors 'none';
base-uri 'self';
object-src 'none';
upgrade-insecure-requests;
```

**Process**

1. Add as `Content-Security-Policy-Report-Only` first, with a `report-uri`
   pointing at a free service (e.g. `report-uri.com`) or your own log
   endpoint.
2. Exercise every flow: signup, signin (OAuth + email), checkout, Stripe
   Connect onboarding, image upload, message send, review submission, email
   tracking pixels.
3. Triage violation reports; tighten or extend directives.
4. Once clean for a week, flip the header name to `Content-Security-Policy`.
5. Remove `'unsafe-inline'` from `script-src` last by adopting per-request
   nonces (Next.js docs cover this).

**Note:** Next.js's built-in `<Script>` strategies and React's hydration
inline scripts may require `'unsafe-inline'` or nonces. Plan time for this.

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
