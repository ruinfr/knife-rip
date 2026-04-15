/**
 * Bootstrap bot owner Discord IDs (always loaded; no DB required).
 *
 * Additional owners are granted by a **Developer** (`lib/bot-developers.ts`) with
 * **`.handout @user add owner`** (stored in `DiscordPrivilege`). Owners cannot add/remove **owner**
 * for each other or change each other’s handouts.
 *
 * To drop this bootstrap ID **without redeploying**, a Developer uses **`.handout @user remove owner`**
 * — that writes `BootstrapOwnerRevocation` so the ID no longer counts as owner (dashboard + bot).
 * Everyone else: **`.handout add owner`** (stored in the database).
 *
 * Owners get:
 * - **Bot:** No prefix cooldown; on admin-gated commands (e.g. `.say`) skip **Discord Administrator**
 *   and **Arivix Pro** checks — works even if your member isn’t cached or you have no staff perms.
 * - **Site:** Treated as Arivix Pro (`/api/internal/entitlement`, dashboard).
 */
/** Single bootstrap owner; promote anyone else with `.handout` (DB). */
export const BOT_OWNER_DISCORD_IDS: readonly string[] = [
  "1462526622648373312",
];

const BOT_OWNER_ID_SET = new Set<string>(BOT_OWNER_DISCORD_IDS);

export function isBotOwnerDiscordId(userId: string): boolean {
  return BOT_OWNER_ID_SET.has(userId);
}
