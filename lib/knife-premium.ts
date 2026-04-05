/**
 * Complimentary Knife Pro by Discord user ID (no purchase / Stripe).
 *
 * These users are treated as Pro on the **site** when they sign in with Discord
 * (dashboard, etc.) and on the **bot** via `GET /api/internal/entitlement`
 * (same path as real Pro — `isPremiumBypassDiscordId` includes this list).
 *
 * They do **not** get bot **owner** perks (prefix cooldown bypass, `.say` admin gate).
 * For that, use `lib/bot-owners.ts` → `BOT_OWNER_DISCORD_IDS`.
 *
 * Add one snowflake string per line inside `KNIFE_PREMIUM_DISCORD_IDS`.
 */
export const KNIFE_PREMIUM_DISCORD_IDS: readonly string[] = [];

const KNIFE_PREMIUM_ID_SET = new Set<string>(KNIFE_PREMIUM_DISCORD_IDS);

/** True if this Discord user id has complimentary Knife Pro (hardcoded list). */
export function isKnifePremium(discordUserId: string): boolean {
  return KNIFE_PREMIUM_ID_SET.has(discordUserId);
}
