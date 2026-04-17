import { DiscordPrivilegeKind } from "@prisma/client";
import { isDeveloperDiscordId } from "@/lib/bot-developers";
import { isBotOwnerDiscordId as isStaticBotOwner } from "@/lib/bot-owners";
import { db } from "@/lib/db";
import { isArivixPremium as isStaticArivixPremium } from "@/lib/arivix-premium";

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

async function isStaticBootstrapOwnerRevoked(
  discordUserId: string,
): Promise<boolean> {
  const row = await db.bootstrapOwnerRevocation.findUnique({
    where: { discordUserId },
  });
  return row != null;
}

/**
 * Bot owner tier (Developer ∪ static owners ∪ DB `.handout owner`) — cooldown bypass, Pro, `.say`, etc.
 * Static file owners can be revoked in DB (`BootstrapOwnerRevocation`) by a Developer.
 */
export async function isBotOwnerDiscordIdResolved(
  discordUserId: string,
): Promise<boolean> {
  if (isDeveloperDiscordId(discordUserId)) return true;
  if (await hasDbPrivilege(discordUserId, DiscordPrivilegeKind.OWNER)) {
    return true;
  }
  if (
    isStaticBotOwner(discordUserId) &&
    !(await isStaticBootstrapOwnerRevoked(discordUserId))
  ) {
    return true;
  }
  return false;
}

/**
 * **Owner** badge / peer checks — excludes Developer-only (they show **Developer** instead).
 */
export async function isRegularOwnerResolved(
  discordUserId: string,
): Promise<boolean> {
  if (isDeveloperDiscordId(discordUserId)) return false;
  if (await hasDbPrivilege(discordUserId, DiscordPrivilegeKind.OWNER)) {
    return true;
  }
  if (
    isStaticBotOwner(discordUserId) &&
    !(await isStaticBootstrapOwnerRevoked(discordUserId))
  ) {
    return true;
  }
  return false;
}

/**
 * Developer `.handout remove owner` for IDs in `lib/bot-owners.ts` with no `DiscordPrivilege` row.
 */
export async function tryRevokeStaticBootstrapOwner(params: {
  discordUserId: string;
  revokedByDiscordId: string | null;
}): Promise<"revoked" | "already_revoked" | "not_static"> {
  if (!isStaticBotOwner(params.discordUserId)) return "not_static";
  const existing = await db.bootstrapOwnerRevocation.findUnique({
    where: { discordUserId: params.discordUserId },
  });
  if (existing) return "already_revoked";
  await db.bootstrapOwnerRevocation.create({
    data: {
      discordUserId: params.discordUserId,
      revokedByDiscordId: params.revokedByDiscordId,
    },
  });
  return "revoked";
}

/** Clears a bootstrap revocation (e.g. after `.handout add owner`). */
export async function clearBootstrapOwnerRevocation(
  discordUserId: string,
): Promise<void> {
  await db.bootstrapOwnerRevocation.deleteMany({
    where: { discordUserId },
  });
}

/** Complimentary Pro: static `ARIVIX_PREMIUM_DISCORD_IDS` and/or DB row (`.handout premium`). */
export async function isArivixPremiumResolved(
  discordUserId: string,
): Promise<boolean> {
  if (isStaticArivixPremium(discordUserId)) return true;
  return hasDbPrivilege(discordUserId, DiscordPrivilegeKind.PREMIUM);
}

/** Pro bypass for dashboard / entitlement (owners + complimentary list + DB). */
export async function isPremiumBypassDiscordIdResolved(
  discordUserId: string,
): Promise<boolean> {
  if (await isBotOwnerDiscordIdResolved(discordUserId)) return true;
  if (await isArivixPremiumResolved(discordUserId)) return true;
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
