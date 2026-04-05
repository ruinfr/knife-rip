import type { Subscription, User } from "@prisma/client";
import { BOT_OWNER_DISCORD_IDS, isBotOwnerDiscordId } from "@/lib/bot-owners";
import { isPremiumBypassDiscordIdResolved } from "@/lib/discord-privilege";
import {
  KNIFE_PREMIUM_DISCORD_IDS,
  isKnifePremium,
} from "@/lib/knife-premium";

export type UserWithSubscription = User & {
  subscription?: Subscription | null;
};

/**
 * Static IDs only (no DB handouts). For full checks use {@link isPremiumBypassDiscordIdResolved}.
 */
export const PREMIUM_BYPASS_DISCORD_IDS = new Set<string>([
  ...BOT_OWNER_DISCORD_IDS,
  ...KNIFE_PREMIUM_DISCORD_IDS,
]);

/**
 * Static hardcoded Pro bypass only (`lib/bot-owners.ts`, `lib/knife-premium.ts`).
 * Handout rows in the DB are included in {@link isPremiumBypassDiscordIdResolved}.
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

/**
 * Same as {@link hasPremiumAccess} plus Discord Pro bypass (static lists + DB `.handout`).
 */
export async function hasPremiumAccessWithDiscordAccount(
  user: UserWithSubscription | null | undefined,
  discordProviderAccountId: string | null | undefined,
): Promise<boolean> {
  if (
    discordProviderAccountId &&
    (await isPremiumBypassDiscordIdResolved(discordProviderAccountId))
  ) {
    return true;
  }
  return hasPremiumAccess(user);
}
