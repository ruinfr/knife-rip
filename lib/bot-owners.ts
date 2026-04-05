/**
 * Bootstrap bot owner Discord IDs (always loaded; no DB required).
 *
 * Additional owners are granted by a **Developer** (`lib/bot-developers.ts`) with
 * **`.handout @user add owner`** (stored in `DiscordPrivilege`). Owners cannot add/remove **owner**
 * for each other or change each other’s handouts.
 *
 * Owners get:
 * - **Bot:** No prefix cooldown; on admin-gated commands (e.g. `.say`) skip **Discord Administrator**
 *   and **Knife Pro** checks — works even if your member isn’t cached or you have no staff perms.
 * - **Site:** Treated as Knife Pro (`/api/internal/entitlement`, dashboard).
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
