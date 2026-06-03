# Migrations — Prisma + Supabase

This project uses Prisma against Supabase Postgres. Supabase ships several
vendor-specific extensions (`supabase_vault`, `pg_stat_statements`, etc.), and
those make Prisma's standard `migrate dev` workflow unusable in this repo.

**Use the `migrate diff` + `migrate deploy` pattern documented below for every
schema change. Do not run `migrate dev` against a Supabase URL.**

---

## Why `prisma migrate dev` doesn't work here

`migrate dev` spins up a temporary "shadow database" on a vanilla Postgres
instance, applies all your migrations to it, and diffs the result against the
live DB. It uses this to detect drift and to validate migrations before
applying.

Two things break that loop on Supabase:

1. **Vendor extensions can't install on the shadow.** `supabase_vault` is a
   Supabase-only build. When the shadow tries to run
   `CREATE EXTENSION "supabase_vault"`, it fails because the extension's shared
   library isn't present on a normal Postgres. Migration validation aborts.

2. **Drift detection misfires on pre-installed extensions.** Even with
   `previewFeatures = ["postgresqlExtensions"]` and schema-qualified
   declarations, Prisma 7.x flags Supabase's pre-installed extensions as drift
   on the first run because the migration history is initially empty.

`migrate diff` and `migrate deploy` skip both checks. They generate and apply
SQL directly without ever touching a shadow DB.

---

## Ongoing workflow: making a schema change

Run this for every change to `prisma/schema.prisma`.

```bash
# 1. Edit prisma/schema.prisma — add/modify/remove models, fields, indexes.

# 2. Pick a short, descriptive name (snake_case, no spaces).
NAME="add_seller_payout_log"

# 3. Create the migration directory.
MIG_DIR="prisma/migrations/$(date -u +%Y%m%d%H%M%S)_${NAME}"
mkdir -p "$MIG_DIR"

# 4. Generate the SQL by diffing your existing migration history against the
#    updated schema. This emits ONLY the delta — exactly what `migrate dev`
#    would generate, minus the drift check.
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema prisma/schema.prisma \
  --script > "$MIG_DIR/migration.sql"

# 5. INSPECT the generated SQL before applying. Catch anything destructive
#    (DROP COLUMN, DROP TABLE, type narrowings that risk data loss).
cat "$MIG_DIR/migration.sql"

# 6. If you need raw SQL Prisma can't express (CHECK constraints, triggers,
#    GIN indexes, etc.), append it to the same migration.sql.
# Example:
#   echo "ALTER TABLE foo ADD CONSTRAINT foo_x_pos_chk CHECK (x > 0);" \
#     >> "$MIG_DIR/migration.sql"

# 7. Apply to staging first (see below), then to prod.
npx prisma migrate deploy

# 8. Regenerate the typed client.
npx prisma generate

# 9. Verify migration status.
npx prisma migrate status
```

`migrate deploy` is the idempotent, production-grade applier. It records the
migration in `_prisma_migrations` and refuses to re-run an already-applied one.

---

## Before applying to production

> Once you have real customer data, **destructive migrations are irreversible
> on Supabase free/pro tiers without a paid backup plan**. Treat every prod
> migration like a one-way door.

### Pre-flight checklist for every prod migration

- [ ] Schema change has been reviewed in a PR.
- [ ] Generated `migration.sql` has been read end-to-end. Specifically look for:
  - [ ] `DROP TABLE`, `DROP COLUMN` → require a separate data-preserving migration
        (see "Destructive changes" below) or explicit sign-off.
  - [ ] `ALTER COLUMN ... TYPE ...` → can rewrite the whole table; check size
        and locking implications.
  - [ ] `NOT NULL` added to existing column → fails if any row has NULL;
        backfill first.
  - [ ] `UNIQUE` added to existing column → fails on duplicates; dedupe first.
  - [ ] Any `CREATE INDEX` on a big table without `CONCURRENTLY` will lock
        writes; edit to `CREATE INDEX CONCURRENTLY` for tables > 100k rows
        (note: not allowed inside a transaction — see Prisma docs for how to
        split).
- [ ] Applied successfully to a **staging Supabase project** that is a recent
      clone of prod.
- [ ] App built against the new Prisma client passes `tsc --noEmit` and tests.
- [ ] Backup taken (Supabase dashboard → Database → Backups, or
      `pg_dump $DIRECT_URL > backup-YYYY-MM-DD.sql`).
- [ ] Deploy window agreed; you can roll the app forward (or back) without
      stranding the DB.

### Application order

1. `npx prisma migrate deploy` against **staging** Supabase first.
2. Smoke test the app against staging.
3. `npx prisma migrate deploy` against **prod**.
4. Deploy the new app build (which uses the new client) immediately after.

Schema changes and app changes that depend on them should ship in the same
release window. The schema should be applied before the app code that uses the
new shape goes live; old code reading new schema usually still works, but new
code reading old schema does not.

---

## Destructive changes — the expand/contract pattern

Never drop a column, table, or rename in a single migration once you have prod
data. Use **expand/contract** across two releases:

### Renaming a column `old_name` → `new_name`

**Release N (expand):**

1. Migration: `ALTER TABLE x ADD COLUMN new_name <type>;`
2. Migration or app code: backfill `new_name` from `old_name`.
3. App writes to both columns (or has a DB trigger keeping them in sync).
4. App reads from `new_name` with `old_name` fallback.

**Release N+1 (contract), after enough time for any old client to drop off:**

5. App reads/writes only `new_name`.
6. Migration: `ALTER TABLE x DROP COLUMN old_name;`

### Dropping a column

**Release N (expand):**

1. App stops reading and writing the column. Deploy.

**Release N+1 (contract):**

2. Migration: `ALTER TABLE x DROP COLUMN old_col;`

### Tightening a constraint (e.g. adding NOT NULL)

**Release N:**

1. Migration: backfill any NULL rows to a sentinel value.
2. App code starts always populating the field.

**Release N+1:**

3. Migration: `ALTER TABLE x ALTER COLUMN col SET NOT NULL;`

---

## Raw SQL that Prisma can't express

Some constraints have no Prisma representation. Keep them in
`prisma/check_constraints.sql` as the canonical list, and append them to each
relevant migration:

```bash
cat prisma/check_constraints.sql >> "$MIG_DIR/migration.sql"
```

When you add a new CHECK, trigger, or extension, update
`prisma/check_constraints.sql` so future regenerations are correct, **and**
ship a migration that adds it to the live DB.

Currently tracked there:

- `reviews.rating BETWEEN 1 AND 5`
- Non-negative money columns on `orders` and `order_items`.
- `order_items.refunded_amount <= unit_amount * quantity`.
- `listings.price_amount > 0`, `listings.stock >= 0`.

---

## Rolling back

There is **no `prisma migrate down`**. To revert a migration in prod:

1. Write a **new** migration that inverts the previous one
   (`ALTER TABLE … DROP COLUMN`, `DROP INDEX`, etc.).
2. Apply it with `migrate deploy`.

If a migration applied but the resulting schema is broken (e.g. partial CHECK
constraint failed mid-way), you'll need to:

1. Either fix forward with a corrective migration, or
2. Restore from the backup taken before the deploy, then mark the failed
   migration as rolled back:
   ```bash
   npx prisma migrate resolve --rolled-back <migration-folder-name>
   ```

---

## Environment setup

`prisma/schema.prisma` should declare both URLs so migrations use the direct
connection (the Supabase pooler can choke on DDL):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooler — app runtime uses this
  directUrl = env("DIRECT_URL")     // direct — migrate deploy uses this
  extensions = [citext(schema: "extensions"), pgcrypto(schema: "extensions"), pg_stat_statements(schema: "extensions"), uuid_ossp(map: "uuid-ossp", schema: "extensions"), supabase_vault(schema: "vault")]
}
```

Set in `.env` / Vercel:

- `DATABASE_URL` — pooler URL, port 5432 (session pooler) or 6543 (transaction
  pooler). Used at app runtime.
- `DIRECT_URL` — direct connection from Supabase dashboard → Project Settings →
  Database → "Connection string" / "Direct connection". Host
  `db.<project-ref>.supabase.co:5432`. Used for `migrate deploy` and `migrate
  diff` operations that touch the live DB.

---

## CI integration

A minimal CI step on the deployment pipeline:

```yaml
- name: Apply DB migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    DIRECT_URL:   ${{ secrets.DIRECT_URL }}
  run: |
    npx prisma migrate status      # fails if drift or pending unapplied
    npx prisma migrate deploy      # idempotent — ack-applied migrations are skipped
```

Keep `migrate deploy` in the deployment pipeline, **not** in the app build, so
a failed migration blocks the rollout cleanly instead of bringing the build
down silently.

---

## Long-term option: a real shadow database

If at some point you want `migrate dev` back (better DX, catches drift
locally), spin up a local Docker Postgres pre-loaded with the Supabase
extension stubs and point Prisma at it as the shadow:

```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  directUrl         = env("DIRECT_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
  extensions        = [...]
}
```

This is overkill for a solo dev workflow. Revisit when you have a team or CI
that benefits from local drift detection.

---

## Quick reference

| Task                              | Command                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| Generate migration                | `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script > $MIG_DIR/migration.sql` |
| Apply migrations                  | `prisma migrate deploy`                                                                  |
| Check status                      | `prisma migrate status`                                                                  |
| Mark a botched migration reverted | `prisma migrate resolve --rolled-back <name>`                                            |
| Mark a manual migration applied   | `prisma migrate resolve --applied <name>`                                                |
| Regenerate client                 | `prisma generate`                                                                        |
| **Do not run in this repo**       | `prisma migrate dev`, `prisma migrate reset` (against prod), `prisma db push` (against prod) |
