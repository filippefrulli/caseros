-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN "integrated_shipping_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "shipped_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN "ships_to_countries" TEXT[] NOT NULL DEFAULT ARRAY['AT', 'BE', 'DE', 'ES', 'FR', 'IE', 'IT', 'NL', 'PT']::TEXT[];
