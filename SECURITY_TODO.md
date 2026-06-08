  3. No deletion audit log (Article 5(2) — accountability)
  When a user's data is erased, there's no record that it happened. You can't currently prove you honoured an erasure request. You
  need a minimal log: who was deleted, when, and that the process completed — without storing the PII you just erased.
  
  4. No data retention/purge job
  Your privacy policy promises order data is deleted after 7 years for tax compliance, but nothing actually enforces that. You already
   have a cron infrastructure in vercel.json — this is just a missing job.
  
  5. No DSAR export (Article 20 — data portability)
  Your privacy policy says users can request their data within 30 days, but there's no /api/account/export endpoint. Currently that
  request would have to be fulfilled manually.


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
