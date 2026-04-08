-- CreateTable
CREATE TABLE "BotGuildJailConfig" (
    "guildId" TEXT NOT NULL,
    "jailRoleId" TEXT NOT NULL,
    "jailChannelId" TEXT NOT NULL,
    "logChannelId" TEXT NOT NULL,
    "categoryId" TEXT,
    "staffAccessRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotGuildJailConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "BotGuildJailMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "removedRoleIds" JSONB NOT NULL,
    "reason" TEXT,
    "jailedByUserId" TEXT,
    "jailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildJailMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotGuildJailMember_guildId_userId_key" ON "BotGuildJailMember"("guildId", "userId");

-- CreateIndex
CREATE INDEX "BotGuildJailMember_guildId_idx" ON "BotGuildJailMember"("guildId");
