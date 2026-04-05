/**
 * Bot owner Discord user IDs — single list to edit when adding an owner.
 *
 * Owners get:
 * - **Bot:** No prefix cooldown; on admin-gated commands (e.g. `.say`) skip **Discord Administrator**
 *   and **Knife Pro** checks — works even if your member isn’t cached or you have no staff perms.
 * - **Site:** Treated as Knife Pro (`/api/internal/entitlement`, dashboard).
 *
 * Add one snowflake string per line inside `BOT_OWNER_DISCORD_IDS`.
 */
export const BOT_OWNER_DISCORD_IDS: readonly string[] = [
  "1462526622648373312",
  "1490466051987865800",
  "1488974367793872926",
];

const BOT_OWNER_ID_SET = new Set<string>(BOT_OWNER_DISCORD_IDS);

export function isBotOwnerDiscordId(userId: string): boolean {
  return BOT_OWNER_ID_SET.has(userId);
}
