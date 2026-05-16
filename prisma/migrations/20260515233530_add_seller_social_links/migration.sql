-- CreateTable
CREATE TABLE "seller_social_links" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "website" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "youtube" TEXT,
    "facebook" TEXT,
    "twitter" TEXT,
    "pinterest" TEXT,
    "linkedin" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_social_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_social_links_seller_id_key" ON "seller_social_links"("seller_id");

-- AddForeignKey
ALTER TABLE "seller_social_links" ADD CONSTRAINT "seller_social_links_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
