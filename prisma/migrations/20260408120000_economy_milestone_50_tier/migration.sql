-- Inserted milestone at 50 msgs (+1 Cash) before the former first tier (100).
-- Shift nextMilestoneIndex so users who already passed 100 under the old 4-tier list
-- are not paid again for 50 + 100 on their next message.

UPDATE "EconomyUser"
SET "nextMilestoneIndex" = "nextMilestoneIndex" + 1
WHERE "nextMilestoneIndex" >= 1;

UPDATE "EconomyUser"
SET "nextMilestoneIndex" = 2
WHERE "nextMilestoneIndex" = 0 AND "lifetimeMessages" >= 100;
