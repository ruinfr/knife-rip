-- CreateTable
CREATE TABLE "BotGuildWebhookLock" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "lockedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildWebhookLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotGuildWebhookLock_webhookId_key" ON "BotGuildWebhookLock"("webhookId");

-- CreateIndex
CREATE INDEX "BotGuildWebhookLock_guildId_idx" ON "BotGuildWebhookLock"("guildId");

-- RenameIndex
ALTER INDEX "BotGuildCommandRoleOverride_guildId_commandKey_roleId_channelSc" RENAME TO "BotGuildCommandRoleOverride_guildId_commandKey_roleId_chann_key";
