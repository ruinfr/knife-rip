-- CreateEnum
CREATE TYPE "BotModCaseKind" AS ENUM (
  'WARN', 'BAN', 'UNBAN', 'KICK', 'SOFTBAN', 'TEMPBAN', 'TIMEOUT', 'JAIL', 'UNJAIL',
  'MUTE', 'UNMUTE', 'UNMUTE_ROLE', 'HARD_BAN', 'PURGE', 'STRIPSTAFF', 'RAID', 'OTHER'
);

-- AlterTable
ALTER TABLE "BotGuildJailMember" ADD COLUMN "releaseAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BotGuildJailMember_guildId_releaseAt_idx" ON "BotGuildJailMember"("guildId", "releaseAt");

-- CreateTable
CREATE TABLE "BotGuildModCase" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "caseNum" INTEGER NOT NULL,
    "kind" "BotModCaseKind" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildModCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotGuildModCase_guildId_caseNum_key" ON "BotGuildModCase"("guildId", "caseNum");
CREATE INDEX "BotGuildModCase_guildId_targetUserId_idx" ON "BotGuildModCase"("guildId", "targetUserId");
CREATE INDEX "BotGuildModCase_guildId_actorUserId_idx" ON "BotGuildModCase"("guildId", "actorUserId");
CREATE INDEX "BotGuildModCase_guildId_createdAt_idx" ON "BotGuildModCase"("guildId", "createdAt");

CREATE TABLE "BotGuildModCaseProof" (
    "id" TEXT NOT NULL,
    "modCaseId" TEXT NOT NULL,
    "url" TEXT,
    "note" TEXT,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildModCaseProof_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotGuildModCaseProof_modCaseId_idx" ON "BotGuildModCaseProof"("modCaseId");

ALTER TABLE "BotGuildModCaseProof" ADD CONSTRAINT "BotGuildModCaseProof_modCaseId_fkey"
  FOREIGN KEY ("modCaseId") REFERENCES "BotGuildModCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BotGuildMemberNote" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildMemberNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotGuildMemberNote_guildId_userId_idx" ON "BotGuildMemberNote"("guildId", "userId");

CREATE TABLE "BotGuildHardban" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildHardban_pkey" PRIMARY KEY ("guildId", "userId")
);

CREATE INDEX "BotGuildHardban_guildId_idx" ON "BotGuildHardban"("guildId");

CREATE TABLE "BotGuildLockdownIgnore" (
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildLockdownIgnore_pkey" PRIMARY KEY ("guildId", "channelId")
);

CREATE INDEX "BotGuildLockdownIgnore_guildId_idx" ON "BotGuildLockdownIgnore"("guildId");

CREATE TABLE "BotGuildLockdownSession" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelIds" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildLockdownSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotGuildLockdownSession_guildId_active_idx" ON "BotGuildLockdownSession"("guildId", "active");

CREATE TABLE "BotGuildTempRoleGrant" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildTempRoleGrant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotGuildTempRoleGrant_guildId_expiresAt_idx" ON "BotGuildTempRoleGrant"("guildId", "expiresAt");
CREATE INDEX "BotGuildTempRoleGrant_guildId_userId_idx" ON "BotGuildTempRoleGrant"("guildId", "userId");

CREATE TABLE "BotGuildStickyRole" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "setById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildStickyRole_pkey" PRIMARY KEY ("guildId", "userId", "roleId")
);

CREATE INDEX "BotGuildStickyRole_guildId_idx" ON "BotGuildStickyRole"("guildId");

CREATE TABLE "BotGuildForcedNickname" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "setById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildForcedNickname_pkey" PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "BotGuildCommandRestrictAllow" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "commandKey" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildCommandRestrictAllow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotGuildCommandRestrictAllow_guildId_commandKey_roleId_key"
  ON "BotGuildCommandRestrictAllow"("guildId", "commandKey", "roleId");
CREATE INDEX "BotGuildCommandRestrictAllow_guildId_commandKey_idx"
  ON "BotGuildCommandRestrictAllow"("guildId", "commandKey");

CREATE TABLE "BotGuildScheduledUnban" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildScheduledUnban_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotGuildScheduledUnban_guildId_userId_key" ON "BotGuildScheduledUnban"("guildId", "userId");
CREATE INDEX "BotGuildScheduledUnban_guildId_expiresAt_idx" ON "BotGuildScheduledUnban"("guildId", "expiresAt");

CREATE TABLE "BotGuildMuteConfig" (
    "guildId" TEXT NOT NULL,
    "mutedRoleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotGuildMuteConfig_pkey" PRIMARY KEY ("guildId")
);

CREATE TABLE "BotGuildMemberRoleSnapshot" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleIds" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotGuildMemberRoleSnapshot_pkey" PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "BotGuildModSettings" (
    "guildId" TEXT NOT NULL,
    "modLogChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotGuildModSettings_pkey" PRIMARY KEY ("guildId")
);

CREATE TABLE "BotGuildNukeSchedule" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "intervalMs" INTEGER NOT NULL,
    "messageText" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildNukeSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotGuildNukeSchedule_guildId_channelId_key" ON "BotGuildNukeSchedule"("guildId", "channelId");
