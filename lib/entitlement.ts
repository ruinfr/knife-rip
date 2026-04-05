import { db } from "@/lib/db";
import { hasPremiumAccess, isPremiumBypassDiscordId } from "@/lib/premium";

/**
 * User-scoped premium: lifetime purchase or active subscription (legacy).
 * Use from the discord.js bot (shared DB) or call GET /api/internal/entitlement.
 */
export async function getPremiumForDiscordUserId(
  discordUserId: string,
): Promise<boolean> {
  if (isPremiumBypassDiscordId(discordUserId)) return true;

  const account = await db.account.findFirst({
    where: { provider: "discord", providerAccountId: discordUserId },
    include: {
      user: { include: { subscription: true } },
    },
  });

  return hasPremiumAccess(account?.user ?? null);
}
