/**
 * Static complimentary Arivix Pro Discord IDs (optional bootstrap list).
 *
 * **Intentionally empty** — use **`.handout @user add premium`** (`DiscordPrivilege`) or Stripe
 * checkout. No hardcoded Pro bypasses except owners/developers via their own modules.
 *
 * These users would be Pro on the **site** and **bot** via `GET /api/internal/entitlement`.
 * They do **not** get bot **owner** perks — use **`.handout owner`** or `lib/bot-owners.ts`.
 */
export const ARIVIX_PREMIUM_DISCORD_IDS: readonly string[] = [];

const ARIVIX_PREMIUM_ID_SET = new Set<string>(ARIVIX_PREMIUM_DISCORD_IDS);

/** True if this Discord user id has complimentary Arivix Pro (hardcoded list). */
export function isArivixPremium(discordUserId: string): boolean {
  return ARIVIX_PREMIUM_ID_SET.has(discordUserId);
}
