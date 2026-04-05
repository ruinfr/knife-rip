import { DiscordPrivilegeKind } from "@prisma/client";
import { isDeveloperDiscordId } from "@/lib/bot-developers";
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

/**
 * Bot owner tier (Developer ∪ static owners ∪ DB `.handout owner`) — cooldown bypass, Pro, `.say`, etc.
 */
export async function isBotOwnerDiscordIdResolved(
  discordUserId: string,
): Promise<boolean> {
  if (isDeveloperDiscordId(discordUserId)) return true;
  if (isStaticBotOwner(discordUserId)) return true;
  return hasDbPrivilege(discordUserId, DiscordPrivilegeKind.OWNER);
}

/**
 * **Owner** badge / peer checks — excludes Developer-only (they show **Developer** instead).
 */
export async function isRegularOwnerResolved(
  discordUserId: string,
): Promise<boolean> {
  if (isDeveloperDiscordId(discordUserId)) return false;
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

/** Removes a DB handout row only (static lists in code are unchanged). */
export async function deleteDiscordPrivilege(params: {
  discordUserId: string;
  kind: DiscordPrivilegeKind;
}): Promise<boolean> {
  const r = await db.discordPrivilege.deleteMany({
    where: {
      discordUserId: params.discordUserId,
      kind: params.kind,
    },
  });
  return r.count > 0;
}
