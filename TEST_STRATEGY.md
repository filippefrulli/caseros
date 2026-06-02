# Test Strategy for Caseros — Solo Dev, Zero-Friction Edition

## Context

Caseros is a Next.js 16 / Prisma 7 / Supabase / Stripe Connect / Shippo handmade marketplace currently shipping with **zero automated tests, zero test tooling, and no CI**. As a solo developer iterating quickly, we want confidence that new changes don't silently break existing money flows (checkout, payouts, refunds) or data integrity (orders, reviews, addresses).

**Constraint that shaped this plan**: the testing workflow must require **the absolute minimum manual input**. The ideal: type `git push`, the suite runs end-to-end without thinking about Docker, migrations, container lifecycle, or test data setup. Everything else is failure.

## Decisions

- **Scope**: comprehensive — unit + integration + component + E2E
- **Test DB**: real Postgres, but spun up **automatically by the test process itself** (no `docker compose up` step)
- **Trigger**: husky pre-push hook (fast suite); GitHub Actions runs full suite including E2E

## The single-command workflow

This is the entire mental model:

```
git push
  └─ husky pre-push fires
     └─ npm run test:pre-push  (≈30s, automatic)
        ├─ tsc --noEmit
        ├─ next lint
        └─ vitest run
           └─ globalSetup auto-spawns Postgres testcontainer
              ├─ prisma db push (in-memory migration)
              ├─ runs unit + integration + component tests in parallel
              └─ tears down container on exit
```

If anything fails, the push is blocked. If everything passes, `git push` proceeds. **No `npm test` to remember, no `docker compose up`, no manual DB reset.** Adding `--no-verify` bypasses (escape hatch for emergencies only).

## Tooling

| Concern | Tool | Why over alternatives |
|---|---|---|
| Test runner | **Vitest** | ESM-native, Vite-fast, Next.js-friendly |
| Test DB | **testcontainers-node** (`@testcontainers/postgresql`) | Programmatically spawns Postgres in Docker — **no docker-compose file, no manual lifecycle**. Container only exists during the test run |
| Component tests | **@testing-library/react** + **user-event** + **jsdom** | Standard, low maintenance |
| E2E | **Playwright** | First-class Next.js support, auto-starts dev server via `webServer` config |
| Stripe mocking | `vi.mock('stripe')` + hand-rolled event factories | stripe-mock is overkill for a solo dev — the events we care about are small JSON objects |
| Shippo/Resend mocking | **MSW** | Intercepts `fetch` in Node; no Docker container needed |
| Supabase auth mocking | Thin wrapper helper (`mockSupabaseUser`) | Avoids spinning up Supabase locally |
| Git hooks | **husky** (no lint-staged) | Pre-push runs the whole fast suite — lint-staged is meaningful for pre-commit, not pre-push |

**Why not docker-compose?** Two reasons: (1) it makes you type `docker compose up` before `npm test`, violating the zero-friction goal; (2) testcontainers gives the same isolation guarantees with zero ceremony — when the test process exits, the container is gone. The only prerequisite is "Docker Desktop is running", which you already do.

## Test DB architecture (zero manual steps)

`tests/helpers/db.ts`:

```ts
import { PostgreSQLContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@/generated/prisma/client';
import { execSync } from 'node:child_process';

let container: StartedTestContainer;
export let prismaTest: PrismaClient;

// Called by vitest globalSetup
export async function startTestDb() {
  container = await new PostgreSQLContainer('postgres:15-alpine').start();
  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  execSync(`npx prisma db push --skip-generate --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: url }
  });
  prismaTest = new PrismaClient({ datasources: { db: { url } } });
}

export async function stopTestDb() {
  await prismaTest.$disconnect();
  await container.stop();
}

// Per-test transaction-rollback wrapper
export async function withTestTx<T>(fn: (tx: PrismaTx) => Promise<T>): Promise<T> {
  return prismaTest.$transaction(async (tx) => {
    const result = await fn(tx);
    throw new RollbackSignal(result);  // forces rollback, then we extract the result
  }).catch((e) => {
    if (e instanceof RollbackSignal) return e.result;
    throw e;
  });
}
```

`vitest.config.ts`:

```ts
export default defineConfig({
  test: {
    globalSetup: './tests/helpers/global-setup.ts',  // startTestDb + stopTestDb
    pool: 'forks',  // each test file gets isolated process; per-test tx still inside
    sequence: { concurrent: false },  // safer with shared DB
  },
});
```

Result: you type nothing. Container appears when tests start, vanishes when they end.

## File layout

```
caseros/
├── vitest.config.ts              # node env, globalSetup
├── vitest.config.dom.ts          # jsdom env for component tests
├── playwright.config.ts          # webServer auto-starts next dev
├── .husky/pre-push               # one line: npm run test:pre-push
├── .github/workflows/test.yml    # CI: full suite incl. E2E
├── tests/
│   ├── helpers/
│   │   ├── global-setup.ts       # startTestDb / stopTestDb
│   │   ├── db.ts                 # prismaTest, withTestTx, RollbackSignal
│   │   ├── factories.ts          # createTestUser, createTestSeller, ...
│   │   ├── supabase.ts           # mockSupabaseUser
│   │   └── mocks/
│   │       ├── stripe.ts         # event factories + vi.mock setup
│   │       ├── shippo.ts         # MSW handlers
│   │       └── resend.ts         # spy on sendEmail
│   ├── unit/                     # pure functions, no DB
│   ├── integration/              # server actions + API routes hitting test DB
│   └── components/               # React components in jsdom
└── e2e/                          # Playwright specs against next dev
```

## Test priorities (write in this order)

### Tier 1 — Money & data integrity (write first, ~15 tests)

**Unit** (`tests/unit/`):
- `pricing.test.ts` — commission rate handling (null, 0, 0.05, 0.5), `sellerPayout = floor(itemsTotal * (1 - commissionRate))`, integer cents only, euros↔cents conversion. Logic is currently inline in `src/app/api/checkout/route.ts` lines 110–113 and `src/lib/actions/listing.ts`; **extract to `src/lib/pricing.ts` first** so it's testable in isolation.
- `shippo-rates.test.ts` — `getRates` sort + cheapest-pick in `src/lib/shippo.ts` (lines 162–223). Mock `fetch`.

**Integration** (`tests/integration/`):
- `stripe-webhook.test.ts` — most important file in the whole suite. With `vi.mock('stripe')` returning hand-built event objects:
  - `payment_intent.succeeded` happy path → order PAID, stock decremented, emails sent
  - `payment_intent.succeeded` oversold path → automatic refund, order CANCELLED
  - `charge.refunded` → order REFUNDED, `refundedAmount` updated
  - Idempotency: same event delivered twice does not double-process
- `checkout-api.test.ts` — `POST /api/checkout`:
  - Rejects buying own listing
  - Rejects when stock insufficient
  - Creates Address with `isDefault: true` and clears previous default in transaction
  - Computes `sellerPayout` correctly with custom `commissionRate`
- `review-action.test.ts` — `submitReview` in `src/lib/actions/review.ts`:
  - Rejects without auth
  - Rejects when no completed order from buyer to seller
  - Rejects when order already reviewed (`Review.orderId @unique`)
  - Succeeds on SHIPPED and DELIVERED orders
- `address-default-flip.test.ts` — `saveBuyerAddress` in `src/lib/actions/buyer.ts`:
  - First address becomes default
  - Saving a second address flips the old one to `isDefault: false` atomically
  - Update-in-place when `addressId` provided and belongs to user
- `label-generation.test.ts` — `POST /api/seller/orders/[id]/label`:
  - Rejects without pickup address
  - Rejects when order not PROCESSING
  - Rejects when label already generated
  - Updates order to SHIPPED with tracking on Shippo success
  - Returns 502 + error JSON when Shippo throws (regression test for the recent fix)

### Tier 2 — UI gates & forms (~8 tests)

**Component** (`tests/components/`):
- `review-form.test.tsx` — star picker, submit disabled until rating set, success message shown
- `listing-form.test.tsx` — dimensions required for physical listings, weight required, price > 0
- `pickup-address-form.test.tsx` — form re-initialises from `state.data` after save (regression test for the empty-after-save bug)
- `buy-now-button.test.tsx` — physical listings navigate to `/checkout/[id]`, digital listings POST directly

### Tier 3 — E2E user journeys (~3 specs)

**Playwright** (`e2e/`):
- `purchase-flow.spec.ts` — sign up → seed seller via API → buy digital listing → verify order appears in `/account/orders`
- `seller-onboarding.spec.ts` — sign up → complete 4-step onboarding → land on dashboard with PENDING status
- `review-flow.spec.ts` — buyer with seeded delivered order → visit shop → submit review → review appears in Reviews tab

E2E does **not** run pre-push (too slow + needs real Supabase). Runs in GitHub Actions only.

## NPM scripts

```jsonc
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:pre-push": "npm run typecheck && npm run lint && npm test",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  }
}
```

Note: **no `db:up`/`db:down` scripts** — testcontainers handles it. You never type a docker command for testing.

## Pre-push hook

`.husky/pre-push` is one line:

```bash
npm run test:pre-push
```

Target runtime budget: **< 30 seconds**. Testcontainers cold-start adds ~2s; subsequent runs reuse the cached image. Vitest parallelism keeps integration tests fast.

If the budget creeps past 60s, the optimisation path is `vitest --changed` (only run tests affected by changed files) rather than splitting the suite.

## CI (GitHub Actions)

`.github/workflows/test.yml`:
- **Job `test`**: Node 22, runs `npm test` — testcontainers spawns Postgres inside the runner; no Postgres service container needed in YAML
- **Job `e2e`**: Node 22, runs `npm run test:e2e` — Playwright auto-starts next dev
- Triggered on push to any branch and pull requests
- Required check on `main`

Same single-command property holds in CI: no manual DB setup in the YAML, no service containers to wire up.

## Refactors required before writing tests

Two small extractions to make pure logic testable in isolation:

1. **`src/lib/pricing.ts`** (new) — pull these out of `src/app/api/checkout/route.ts` and `src/lib/actions/listing.ts`:
   - `calculateSellerPayout(itemsTotal: number, commissionRate: number | Decimal | null): number`
   - `eurosToCents(euros: number): number`
   - `centsToEuros(cents: number): number`

2. **`src/lib/refund.ts`** (new) — extract refund-distribution math from `src/app/api/webhooks/stripe/route.ts` (around lines 295-304) so the proportional split is testable without firing a full webhook event.

These extractions are independently valuable (cleaner separation of concerns) and unblock unit tests that would otherwise have to set up a whole HTTP request to exercise three lines of math.

## Verification (when implemented)

End-to-end verification that the whole thing works without manual input:

1. **Cold start**: `rm -rf node_modules`, `npm install`, then `npm test`. Expect: testcontainer image pulls, Postgres spins up, migrations run, suite passes. **Zero other commands typed.**
2. **Intentional regression**: in `src/app/api/checkout/route.ts`, swap `1 - commissionRate` for `1 + commissionRate`. Run `npm test`. Expect `pricing.test.ts` to fail with a clear message.
3. **Push blocked**: `git push` with the regression — husky should block before network. Revert, push again — should succeed.
4. **CI dry run**: open a PR with a passing branch — both `test` and `e2e` jobs should run and report green; no manual intervention.
5. **Docker not running** (negative test): stop Docker Desktop, run `npm test` — expect a clear error from testcontainers saying Docker isn't available. This is the only manual prerequisite to satisfy.

## Maintenance principles

- **Test the contract, not the implementation.** Tests should survive internal refactors.
- **One assertion per test where reasonable.** Easier to diagnose failures.
- **No snapshot tests.** Brittle, low signal.
- **Delete flaky tests immediately.** A flaky test is worse than no test.
- **No mocks for code you own.** Mock only the system boundary (Stripe, Shippo, Resend, Supabase auth). Everything else hits the real test DB via the transaction wrapper.
- **When a bug ships, write a regression test before fixing.** Confirms the test reproduces, then watch it go green after the fix.
- **Keep the pre-push budget under a minute.** Past that, you'll start using `--no-verify` and the whole system rots.
