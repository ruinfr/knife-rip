/**
 * Web roulette settlement — same payouts as Discord `runHouseGame` roulette branch.
 */
import { randomInt } from "node:crypto";

import {
  americanRoulettePocketLabel,
  roulettePocketColor,
  type RoulettePick,
} from "./web-roulette-constants";

export const WEB_ROULETTE_MULT_CENTS = BigInt(100);

export function spinAmericanRouletteIndex(): number {
  return randomInt(38);
}

export function webRouletteSettle(
  pick: RoulettePick,
  bet: bigint,
  pocketIdx: number,
  mc: bigint,
): {
  payout: bigint;
  won: boolean;
  pocketLabel: string;
  ballColor: ReturnType<typeof roulettePocketColor>;
} {
  const pocketLabel = americanRoulettePocketLabel(pocketIdx);
  const ballColor = roulettePocketColor(pocketLabel);

  let win = false;
  if (pick === "green") win = ballColor === "green";
  else if (pick === "red") win = ballColor === "red";
  else win = ballColor === "black";

  let payout = BigInt(0);
  if (pick === "green" && win) {
    payout = (bet * BigInt(19) * mc) / BigInt(100);
  } else if ((pick === "red" || pick === "black") && win) {
    payout = (bet * BigInt(2) * mc) / BigInt(100);
  }

  return { payout, won: win, pocketLabel, ballColor };
}
