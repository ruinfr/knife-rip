-- CreateEnum
CREATE TYPE "DiscordPrivilegeKind" AS ENUM ('OWNER', 'PREMIUM');

-- CreateTable
CREATE TABLE "DiscordPrivilege" (
    "id" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "kind" "DiscordPrivilegeKind" NOT NULL,
    "grantedByDiscordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordPrivilege_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordPrivilege_discordUserId_kind_key" ON "DiscordPrivilege"("discordUserId", "kind");

-- CreateIndex
CREATE INDEX "DiscordPrivilege_discordUserId_idx" ON "DiscordPrivilege"("discordUserId");
