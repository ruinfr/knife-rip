import { randomInt } from "node:crypto";

/** Same reel symbols as Discord hub slots (`games.ts`). */
export const WEB_SLOT_SYMBOLS = ["🍒", "🍋", "🍇", "⭐", "💎", "7️⃣"] as const;

export type WebSlotSymbol = (typeof WEB_SLOT_SYMBOLS)[number];

export function rollWebSlotSymbols(): [WebSlotSymbol, WebSlotSymbol, WebSlotSymbol] {
  return [
    WEB_SLOT_SYMBOLS[randomInt(6)]!,
    WEB_SLOT_SYMBOLS[randomInt(6)]!,
    WEB_SLOT_SYMBOLS[randomInt(6)]!,
  ];
}

/**
 * Hub rules with multiplier 1.0 (mc=100): triple 5×, pair 1.5× (min 1), else 0.
 */
export function webSlotsPayout(
  a: string,
  b: string,
  c: string,
  bet: bigint,
): { payout: bigint; tier: "triple" | "pair" | "none" } {
  const mc = BigInt(100);
  if (a === b && b === c) {
    return { payout: (bet * BigInt(5) * mc) / BigInt(100), tier: "triple" };
  }
  if (a === b || b === c || a === c) {
    let payout = (bet * BigInt(3) * mc) / BigInt(200);
    if (payout < BigInt(1)) payout = BigInt(1);
    return { payout, tier: "pair" };
  }
  return { payout: BigInt(0), tier: "none" };
}

/**
 * Hub dice: two fair d6; optional second roll for player when behind (rebirth bias).
 */
export function rollWebDice(playerBias: number): { you: number; house: number } {
  let you = 1 + randomInt(6);
  const house = 1 + randomInt(6);
  if (
    you < house &&
    Math.random() < Math.min(0.12, playerBias * 4 || 0)
  ) {
    you = 1 + randomInt(6);
  }
  return { you, house };
}

/** Hub payout with mult 1.0: win 2×, push stake back, lose 0. */
export function webDicePayout(
  you: number,
  house: number,
  bet: bigint,
): { payout: bigint; outcome: "win" | "lose" | "push" } {
  const mc = BigInt(100);
  if (you > house) {
    return { payout: (bet * BigInt(2) * mc) / BigInt(100), outcome: "win" };
  }
  if (you < house) {
    return { payout: BigInt(0), outcome: "lose" };
  }
  return { payout: bet, outcome: "push" };
}
