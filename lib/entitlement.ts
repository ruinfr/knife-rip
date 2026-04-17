import { isDeveloperDiscordId } from "@/lib/bot-developers";
import {
  isBotOwnerDiscordIdResolved,
  isArivixPremiumResolved,
} from "@/lib/discord-privilege";
import { db } from "@/lib/db";
import { hasPremiumAccess } from "@/lib/premium";

export type DiscordEntitlement = {
  premium: boolean;
  /** Bot owner tier (includes developers). */
  owner: boolean;
  /** Developer list / env — used for Discord staff role sync. */
  developer: boolean;
};

/**
 * Bot + site: Pro (bypass, purchase, or sub), owner tier, and developer flag.
 * Single pass — avoids duplicate privilege queries per request.
 */
export async function getEntitlementForDiscordUserId(
  discordUserId: string,
): Promise<DiscordEntitlement> {
  const developer = isDeveloperDiscordId(discordUserId);
  const owner = await isBotOwnerDiscordIdResolved(discordUserId);
  if (owner) {
    return { premium: true, owner: true, developer };
  }
  if (await isArivixPremiumResolved(discordUserId)) {
    return { premium: true, owner: false, developer };
  }

  const account = await db.account.findFirst({
    where: { provider: "discord", providerAccountId: discordUserId },
    include: {
      user: { include: { subscription: true } },
    },
  });

  const premium = hasPremiumAccess(account?.user ?? null);
  return { premium, owner: false, developer };
}

/**
 * User-scoped premium: lifetime purchase, active subscription, or bypass lists (incl. DB).
 * Use from the discord.js bot (shared DB) or call GET /api/internal/entitlement.
 */
export async function getPremiumForDiscordUserId(
  discordUserId: string,
): Promise<boolean> {
  const { premium } = await getEntitlementForDiscordUserId(discordUserId);
  return premium;
}
