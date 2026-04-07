-- CreateTable
CREATE TABLE "EconomyUser" (
    "discordUserId" TEXT NOT NULL,
    "cash" BIGINT NOT NULL DEFAULT 0,
    "lifetimeMessages" INTEGER NOT NULL DEFAULT 0,
    "nextMilestoneIndex" INTEGER NOT NULL DEFAULT 0,
    "gambleWins" INTEGER NOT NULL DEFAULT 0,
    "gambleLosses" INTEGER NOT NULL DEFAULT 0,
    "gambleNetProfit" BIGINT NOT NULL DEFAULT 0,
    "gambleWinStreak" INTEGER NOT NULL DEFAULT 0,
    "gambleBestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPayAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomyUser_pkey" PRIMARY KEY ("discordUserId")
);

-- CreateTable
CREATE TABLE "EconomyLedger" (
    "id" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "delta" BIGINT NOT NULL,
    "balanceAfter" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "meta" JSONB,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomyLedger_discordUserId_createdAt_idx" ON "EconomyLedger"("discordUserId", "createdAt");

-- CreateTable
CREATE TABLE "EconomyShopItem" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EconomyShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomyGambleLog" (
    "id" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "bet" BIGINT NOT NULL,
    "payout" BIGINT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomyGambleLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomyGambleLog_discordUserId_createdAt_idx" ON "EconomyGambleLog"("discordUserId", "createdAt");
