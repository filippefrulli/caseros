/*
  Warnings:

  - A unique constraint covering the columns `[stripe_charge_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[checkout_session_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_REFUNDED';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "payout_released_at" TIMESTAMP(3),
ADD COLUMN     "refunded_amount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "checkout_session_id" TEXT,
ADD COLUMN     "stripe_charge_id" TEXT;

-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN     "payouts_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripe_charge_id_key" ON "orders"("stripe_charge_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_checkout_session_id_key" ON "orders"("checkout_session_id");
