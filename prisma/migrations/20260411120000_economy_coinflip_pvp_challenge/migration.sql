-- CreateTable
CREATE TABLE "EconomyCoinflipPvpChallenge" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "challengerDiscordId" TEXT NOT NULL,
    "opponentDiscordId" TEXT NOT NULL,
    "bet" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "winnerDiscordId" TEXT,
    "outcomeHeads" BOOLEAN,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomyCoinflipPvpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomyCoinflipPvpChallenge_status_expiresAt_idx" ON "EconomyCoinflipPvpChallenge"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "EconomyCoinflipPvpChallenge_opponentDiscordId_status_idx" ON "EconomyCoinflipPvpChallenge"("opponentDiscordId", "status");
