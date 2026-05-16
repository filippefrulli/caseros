/*
  Warnings:

  - You are about to drop the `cart_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `carts` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('INDIVIDUAL', 'TRADER');

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_cart_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "carts" DROP CONSTRAINT "carts_user_id_fkey";

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "video_url" TEXT;

-- DropTable
DROP TABLE "cart_items";

-- DropTable
DROP TABLE "carts";

-- CreateTable
CREATE TABLE "seller_kyc" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "seller_type" "SellerType" NOT NULL,
    "full_name" TEXT,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "business_reg_number" TEXT,
    "safety_compliant" BOOLEAN NOT NULL DEFAULT false,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "disclaimer_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_kyc_seller_id_key" ON "seller_kyc"("seller_id");

-- AddForeignKey
ALTER TABLE "seller_kyc" ADD CONSTRAINT "seller_kyc_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
