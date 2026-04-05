import {
  isBotOwnerDiscordIdResolved,
  isKnifePremiumResolved,
} from "@/lib/discord-privilege";
import { db } from "@/lib/db";
import { hasPremiumAccess } from "@/lib/premium";

/**
 * Bot + site: Pro (bypass, purchase, or sub) and owner (static + DB).
 * Single pass — avoids duplicate privilege queries per request.
 */
export async function getEntitlementForDiscordUserId(
  discordUserId: string,
): Promise<{ premium: boolean; owner: boolean }> {
  const owner = await isBotOwnerDiscordIdResolved(discordUserId);
  if (owner) {
    return { premium: true, owner: true };
  }
  if (await isKnifePremiumResolved(discordUserId)) {
    return { premium: true, owner: false };
  }

  const account = await db.account.findFirst({
    where: { provider: "discord", providerAccountId: discordUserId },
    include: {
      user: { include: { subscription: true } },
    },
  });

  const premium = hasPremiumAccess(account?.user ?? null);
  return { premium, owner: false };
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
