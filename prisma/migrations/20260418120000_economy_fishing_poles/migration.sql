-- AlterTable
ALTER TABLE "EconomyUser" ADD COLUMN     "fishingPoleEquipped" TEXT NOT NULL DEFAULT 'twig',
ADD COLUMN     "fishingPolesOwned" JSONB;

UPDATE "EconomyUser" SET "fishingPolesOwned" = '["twig"]'::jsonb WHERE "fishingPolesOwned" IS NULL;
