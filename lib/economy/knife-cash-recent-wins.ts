import { formatCash } from "./money";

/** Minimum spacing between site bets per game — blocks accidental double-submit / naive spam. */
export const WEB_GAMBLE_COOLDOWN_MS = 400;

export function webGambleCooldownLabel(): string {
  if (WEB_GAMBLE_COOLDOWN_MS < 1000) {
    return `${WEB_GAMBLE_COOLDOWN_MS}ms`;
  }
  return `${(WEB_GAMBLE_COOLDOWN_MS / 1000).toFixed(1)}s`;
}

const GAME_LABELS: Record<string, string> = {
  web_coinflip: "Coin flip",
  web_dice: "Dice duel",
  web_slots: "Slots",
  coinflip: "Coin flip",
  dice: "Dice",
  slots: "Slots",
  roulette: "Roulette",
  blackjack: "Blackjack",
  mines: "Mines",
  pvp_coinflip: "PvP coin flip",
};

export function labelForGambleGameKey(game: string): string {
  return GAME_LABELS[game] ?? game.replace(/^web_/, "").replace(/_/g, " ");
}

export function formatProfitForRecentWin(bet: bigint, payout: bigint): string {
  const profit = payout - bet;
  if (profit <= BigInt(0)) return formatCash(BigInt(0));
  return `+${formatCash(profit)}`;
}

/** Light mask for lobby ticker (still readable). */
export function maskPlayerTag(username: string | null): string {
  if (!username?.trim()) return "Player";
  const u = username.trim();
  if (u.length <= 2) return `${u[0] ?? "?"}••`;
  return `${u.slice(0, 3)}••`;
}
