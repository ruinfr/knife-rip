/** House bank for negative player net on gambles (matches bot `wallet.ts`). */
export const GAMBLE_HOUSE_USER_ID = "1490466051987865800";

/** Receives explicit economy fees; override via `ECONOMY_TREASURY_USER_ID`. */
export function getEconomyTreasuryUserId(): string {
  const id = process.env.ECONOMY_TREASURY_USER_ID?.trim();
  return id && /^\d{17,20}$/.test(id) ? id : GAMBLE_HOUSE_USER_ID;
}
