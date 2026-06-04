-- CreateTable
CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "label_creation_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);
