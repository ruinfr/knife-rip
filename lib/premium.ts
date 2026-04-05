import type { Subscription, User } from "@prisma/client";

export type UserWithSubscription = User & {
  subscription?: Subscription | null;
};

/**
 * Discord snowflakes that always count as Pro (site + bot). Keep in sync with
 * `bot/src/lib/owner-bypass.ts` → `COMMAND_OWNER_BYPASS_DISCORD_IDS`.
 */
export const PREMIUM_BYPASS_DISCORD_IDS = new Set<string>([
  "1462526622648373312",
]);

export function isPremiumBypassDiscordId(discordUserId: string): boolean {
  return PREMIUM_BYPASS_DISCORD_IDS.has(discordUserId);
}

/**
 * Premium: lifetime purchase and/or an active recurring subscription (legacy).
 */
export function hasPremiumAccess(
  user: UserWithSubscription | null | undefined,
): boolean {
  if (!user) return false;
  if (user.lifetimePremiumAt) return true;
  const sub = user.subscription;
  if (!sub) return false;
  return (
    (sub.status === "active" || sub.status === "trialing") &&
    sub.currentPeriodEnd > new Date()
  );
}

/** Same as {@link hasPremiumAccess} plus hardcoded Discord Pro bypass (dashboard UI). */
export function hasPremiumAccessWithDiscordAccount(
  user: UserWithSubscription | null | undefined,
  discordProviderAccountId: string | null | undefined,
): boolean {
  if (discordProviderAccountId && isPremiumBypassDiscordId(discordProviderAccountId)) {
    return true;
  }
  return hasPremiumAccess(user);
}
