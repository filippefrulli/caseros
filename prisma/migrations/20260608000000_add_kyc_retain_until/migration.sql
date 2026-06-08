-- Add AML retention deadline to seller_kyc.
-- NULL = record is live; non-null = account was deleted, purge after this date.
ALTER TABLE "seller_kyc" ADD COLUMN "retain_until" TIMESTAMP(3);

CREATE INDEX "seller_kyc_retain_until_idx" ON "seller_kyc"("retain_until");
