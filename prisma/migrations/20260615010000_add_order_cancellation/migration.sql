-- AlterTable
ALTER TABLE "orders" ADD COLUMN "cancellation_reason" TEXT;
ALTER TABLE "orders" ADD COLUMN "cancelled_at" TIMESTAMP(3);
