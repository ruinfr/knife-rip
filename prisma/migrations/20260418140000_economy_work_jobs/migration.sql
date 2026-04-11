-- AlterTable
ALTER TABLE "EconomyUser" ADD COLUMN     "workJobEquipped" TEXT NOT NULL DEFAULT 'intern',
ADD COLUMN     "workJobsOwned" JSONB;

UPDATE "EconomyUser" SET "workJobsOwned" = '["intern"]'::jsonb WHERE "workJobsOwned" IS NULL;
