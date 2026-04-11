-- AlterTable
ALTER TABLE "EconomyUser" ADD COLUMN     "miningPickEquipped" TEXT NOT NULL DEFAULT 'stone',
ADD COLUMN     "miningPicksOwned" JSONB;

UPDATE "EconomyUser" SET "miningPicksOwned" = '["stone"]'::jsonb WHERE "miningPicksOwned" IS NULL;
