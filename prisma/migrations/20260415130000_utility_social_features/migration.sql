-- Highlight keywords
CREATE TABLE "BotGuildHighlightKeyword" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildHighlightKeyword_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotGuildHighlightKeyword_guildId_userId_keyword_key"
  ON "BotGuildHighlightKeyword"("guildId", "userId", "keyword");

CREATE INDEX "BotGuildHighlightKeyword_guildId_idx" ON "BotGuildHighlightKeyword"("guildId");

CREATE TABLE "BotGuildHighlightIgnore" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildHighlightIgnore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotGuildHighlightIgnore_guildId_subscriberId_targetType_targetId_key"
  ON "BotGuildHighlightIgnore"("guildId", "subscriberId", "targetType", "targetId");

CREATE INDEX "BotGuildHighlightIgnore_guildId_subscriberId_idx"
  ON "BotGuildHighlightIgnore"("guildId", "subscriberId");

CREATE TABLE "BotGuildBirthdaySettings" (
    "guildId" TEXT NOT NULL,
    "announceChannelId" TEXT,
    "roleId" TEXT,
    "celebrateRoleId" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildBirthdaySettings_pkey" PRIMARY KEY ("guildId")
);

CREATE TABLE "BotGuildMemberBirthday" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "year" INTEGER,
    "unlocked" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildMemberBirthday_pkey" PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "BotUserTimezone" (
    "userId" TEXT NOT NULL,
    "iana" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotUserTimezone_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "BotGuildUserLastSeen" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildUserLastSeen_pkey" PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "BotGuildEmojiUsage" (
    "guildId" TEXT NOT NULL,
    "emojiId" TEXT NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BotGuildEmojiUsage_pkey" PRIMARY KEY ("guildId", "emojiId")
);

CREATE TABLE "BotGuildBoosterEvent" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotGuildBoosterEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotGuildBoosterEvent_guildId_at_idx" ON "BotGuildBoosterEvent"("guildId", "at");
