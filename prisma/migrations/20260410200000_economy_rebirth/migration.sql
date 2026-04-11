-- Rebirth progression (soft reset) + gem shop JSON
ALTER TABLE "EconomyUser" ADD COLUMN "rebirthCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EconomyUser" ADD COLUMN "rebirthGems" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "EconomyUser" ADD COLUMN "lastRebirthAt" TIMESTAMP(3);
ALTER TABLE "EconomyUser" ADD COLUMN "rebirthShop" JSONB;
