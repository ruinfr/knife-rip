/** Mirrors `REBIRTH_HOUSE_WIN_BIAS_PER_REBIRTH` in bot `rebirth-mult.ts`. */
const REBIRTH_HOUSE_WIN_BIAS_PER_REBIRTH = 0.003;

/** Same formula as `rebirthHouseWinBias` on Discord. */
export function webRebirthHouseWinBias(rebirthCount: number): number {
  return Math.min(0.06, rebirthCount * REBIRTH_HOUSE_WIN_BIAS_PER_REBIRTH);
}

/**
 * Same win chance as Discord hub coinflip (`games.ts`): min(0.52, 0.5 + bias).
 */
export function webCoinflipWin(rebirthCount: number): boolean {
  const bias = webRebirthHouseWinBias(rebirthCount);
  return Math.random() < Math.min(0.52, 0.5 + bias);
}
