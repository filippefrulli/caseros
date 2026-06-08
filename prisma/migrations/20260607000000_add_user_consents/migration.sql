CREATE TABLE "user_consents" (
  "id"             TEXT         NOT NULL,
  "user_id"        TEXT         NOT NULL,
  "policy_type"    TEXT         NOT NULL,
  "policy_version" TEXT         NOT NULL,
  "method"         TEXT         NOT NULL,
  "consented_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address"     TEXT,
  "user_agent"     TEXT,

  CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_consents"
  ADD CONSTRAINT "user_consents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "user_consents_user_id_idx" ON "user_consents"("user_id");
