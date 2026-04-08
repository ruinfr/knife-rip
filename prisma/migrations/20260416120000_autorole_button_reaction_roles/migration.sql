-- Autoroles on join
CREATE TABLE "BotGuildAutorole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildAutorole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotGuildAutorole_guildId_roleId_key" ON "BotGuildAutorole"("guildId", "roleId");
CREATE INDEX "BotGuildAutorole_guildId_idx" ON "BotGuildAutorole"("guildId");

-- Reaction roles
CREATE TABLE "BotGuildReactionRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "emojiKey" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildReactionRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotGuildReactionRole_guildId_channelId_messageId_emojiKey_key"
  ON "BotGuildReactionRole"("guildId", "channelId", "messageId", "emojiKey");
CREATE INDEX "BotGuildReactionRole_guildId_idx" ON "BotGuildReactionRole"("guildId");
CREATE INDEX "BotGuildReactionRole_channelId_messageId_idx" ON "BotGuildReactionRole"("channelId", "messageId");

CREATE TABLE "BotGuildReactionRoleSettings" (
    "guildId" TEXT NOT NULL,
    "restoreOnRejoin" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildReactionRoleSettings_pkey" PRIMARY KEY ("guildId")
);

CREATE TABLE "BotGuildReactionRoleGrant" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "BotGuildReactionRoleGrant_pkey" PRIMARY KEY ("guildId", "userId", "roleId")
);

CREATE INDEX "BotGuildReactionRoleGrant_guildId_userId_idx" ON "BotGuildReactionRoleGrant"("guildId", "userId");

-- Button roles (message must be authored by the bot)
CREATE TABLE "BotGuildButtonRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "style" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "emojiJson" TEXT,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildButtonRole_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotGuildButtonRole_guildId_idx" ON "BotGuildButtonRole"("guildId");
CREATE INDEX "BotGuildButtonRole_guildId_channelId_messageId_idx" ON "BotGuildButtonRole"("guildId", "channelId", "messageId");
