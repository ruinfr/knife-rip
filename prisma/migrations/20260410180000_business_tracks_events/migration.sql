-- Per-site specialization tracks + temporary debuffs + randomized business events
ALTER TABLE "EconomyBusinessSlot" ADD COLUMN "marketingLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EconomyBusinessSlot" ADD COLUMN "automationLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EconomyBusinessSlot" ADD COLUMN "staffLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EconomyBusinessSlot" ADD COLUMN "equipmentLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EconomyBusinessSlot" ADD COLUMN "debuffBps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EconomyBusinessSlot" ADD COLUMN "debuffUntil" TIMESTAMP(3);

ALTER TABLE "EconomyUser" ADD COLUMN "businessEventLastRollAt" TIMESTAMP(3);

CREATE TABLE "EconomyBusinessEvent" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "businessKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomyBusinessEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EconomyBusinessEvent_ownerId_resolved_expiresAt_idx" ON "EconomyBusinessEvent"("ownerId", "resolved", "expiresAt");

ALTER TABLE "EconomyBusinessEvent" ADD CONSTRAINT "EconomyBusinessEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "EconomyUser"("discordUserId") ON DELETE CASCADE ON UPDATE CASCADE;
