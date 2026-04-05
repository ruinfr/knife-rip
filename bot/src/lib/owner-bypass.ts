import { isBotOwnerDiscordId } from "../../../lib/bot-owners";

/**
 * Bot owners (`BOT_OWNER_DISCORD_IDS`): no prefix cooldown; skip Discord Administrator + Pro gates
 * on commands that check both (e.g. `.say`). Edit IDs in `lib/bot-owners.ts`.
 */
export function isCommandOwnerBypass(userId: string): boolean {
  return isBotOwnerDiscordId(userId);
}
