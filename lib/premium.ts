import type { Subscription, User } from "@prisma/client";
import { BOT_OWNER_DISCORD_IDS, isBotOwnerDiscordId } from "@/lib/bot-owners";
import {
  KNIFE_PREMIUM_DISCORD_IDS,
  isKnifePremium,
} from "@/lib/knife-premium";

export type UserWithSubscription = User & {
  subscription?: Subscription | null;
};

/**
 * All Discord IDs that count as Knife Pro without a DB purchase
 * (bot owners + {@link KNIFE_PREMIUM_DISCORD_IDS}).
 */
export const PREMIUM_BYPASS_DISCORD_IDS = new Set<string>([
  ...BOT_OWNER_DISCORD_IDS,
  ...KNIFE_PREMIUM_DISCORD_IDS,
]);

/**
 * Site + bot entitlement: Pro for bot owners, complimentary premium list, or Stripe/DB.
 * @see lib/bot-owners.ts
 * @see lib/knife-premium.ts — {@link isKnifePremium}
 */
export function isPremiumBypassDiscordId(discordUserId: string): boolean {
  return isBotOwnerDiscordId(discordUserId) || isKnifePremium(discordUserId);
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
