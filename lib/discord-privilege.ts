import { DiscordPrivilegeKind } from "@prisma/client";
import { isBotOwnerDiscordId as isStaticBotOwner } from "@/lib/bot-owners";
import { db } from "@/lib/db";
import { isKnifePremium as isStaticKnifePremium } from "@/lib/knife-premium";

async function hasDbPrivilege(
  discordUserId: string,
  kind: DiscordPrivilegeKind,
): Promise<boolean> {
  const row = await db.discordPrivilege.findUnique({
    where: {
      discordUserId_kind: { discordUserId, kind },
    },
  });
  return row != null;
}

/** Bot owner: static list in `lib/bot-owners.ts` and/or DB row (`.handout owner`). */
export async function isBotOwnerDiscordIdResolved(
  discordUserId: string,
): Promise<boolean> {
  if (isStaticBotOwner(discordUserId)) return true;
  return hasDbPrivilege(discordUserId, DiscordPrivilegeKind.OWNER);
}

/** Complimentary Pro: static `KNIFE_PREMIUM_DISCORD_IDS` and/or DB row (`.handout premium`). */
export async function isKnifePremiumResolved(
  discordUserId: string,
): Promise<boolean> {
  if (isStaticKnifePremium(discordUserId)) return true;
  return hasDbPrivilege(discordUserId, DiscordPrivilegeKind.PREMIUM);
}

/** Pro bypass for dashboard / entitlement (owners + complimentary list + DB). */
export async function isPremiumBypassDiscordIdResolved(
  discordUserId: string,
): Promise<boolean> {
  if (await isBotOwnerDiscordIdResolved(discordUserId)) return true;
  if (await isKnifePremiumResolved(discordUserId)) return true;
  return false;
}

export async function upsertDiscordPrivilege(params: {
  discordUserId: string;
  kind: DiscordPrivilegeKind;
  grantedByDiscordId: string | null;
}): Promise<void> {
  await db.discordPrivilege.upsert({
    where: {
      discordUserId_kind: {
        discordUserId: params.discordUserId,
        kind: params.kind,
      },
    },
    create: {
      discordUserId: params.discordUserId,
      kind: params.kind,
      grantedByDiscordId: params.grantedByDiscordId,
    },
    update: {
      grantedByDiscordId: params.grantedByDiscordId,
    },
  });
}
