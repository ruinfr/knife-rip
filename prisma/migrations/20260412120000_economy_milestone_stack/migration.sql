-- AlterTable
ALTER TABLE "EconomyUser" ADD COLUMN "milestoneLastPaid50" INTEGER NOT NULL DEFAULT 0;

-- Map legacy nextMilestoneIndex (tiers 50/100/500/1k/3k) → stacked 50-cursor + high-tier cursor only.
UPDATE "EconomyUser"
SET
  "milestoneLastPaid50" = CASE
    WHEN "nextMilestoneIndex" <= 0 THEN 0
    WHEN "nextMilestoneIndex" = 1 THEN 50
    WHEN "nextMilestoneIndex" = 2 THEN 100
    WHEN "nextMilestoneIndex" = 3 THEN 500
    WHEN "nextMilestoneIndex" = 4 THEN 1000
    ELSE 3000
  END,
  "nextMilestoneIndex" = CASE
    WHEN "nextMilestoneIndex" <= 2 THEN 0
    WHEN "nextMilestoneIndex" = 3 THEN 1
    WHEN "nextMilestoneIndex" = 4 THEN 2
    WHEN "nextMilestoneIndex" >= 5 THEN 3
    ELSE 0
  END;
