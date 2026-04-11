/** `EconomyGambleLog.game` key for site coin flip (2× payout on win). */
export const WEB_COINFLIP_GAME_KEY = "web_coinflip";

export const WEB_DICE_GAME_KEY = "web_dice";

export const WEB_SLOTS_GAME_KEY = "web_slots";

/**
 * Re-export: tiny per-game gap so double-clicks don’t double-settle.
 * Real rate limits stay server-side (DB + auth).
 */
export { WEB_GAMBLE_COOLDOWN_MS } from "./knife-cash-recent-wins";
