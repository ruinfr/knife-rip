/**
 * Static complimentary Knife Pro Discord IDs (optional bootstrap list).
 *
 * For runtime grants without deploy, use **`.handout premium @user`** (see `DiscordPrivilege` in
 * Prisma). Entitlement merges this array with the database.
 *
 * These users are Pro on the **site** and **bot** via `GET /api/internal/entitlement`.
 * They do **not** get bot **owner** perks — use **`.handout owner`** or `lib/bot-owners.ts`.
 */
export const KNIFE_PREMIUM_DISCORD_IDS: readonly string[] = [];

const KNIFE_PREMIUM_ID_SET = new Set<string>(KNIFE_PREMIUM_DISCORD_IDS);

/** True if this Discord user id has complimentary Knife Pro (hardcoded list). */
export function isKnifePremium(discordUserId: string): boolean {
  return KNIFE_PREMIUM_ID_SET.has(discordUserId);
}
