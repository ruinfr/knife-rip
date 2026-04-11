/**
 * Web blackjack — same rules as Discord `blackjack-flow.ts` (hit / stand only;
 * dealer draws until ≥ 17; natural pays 3:2 on the mult slice).
 */
import { randomInt } from "node:crypto";

export const BJ_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export type BJRank = (typeof BJ_RANKS)[number];

export type BJCard = { rank: BJRank };

/** Hub mult in hundredths (1.00 → 100). Web uses 100 = no Nitro/pet slice. */
export const WEB_BJ_MULT_CENTS = BigInt(100);

export const WEB_BJ_SESSION_TTL_MS = 20 * 60 * 1000;

export type WebBlackjackStoredState = {
  bet: string;
  player: BJCard[];
  dealer: BJCard[];
  phase: "player";
  createdAt: number;
};

export function drawBlackjackCard(): BJCard {
  return { rank: BJ_RANKS[randomInt(BJ_RANKS.length)]! };
}

export function blackjackHandValue(cards: BJCard[]): number {
  let sum = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces++;
      sum += 11;
    } else if (
      c.rank === "10" ||
      c.rank === "J" ||
      c.rank === "Q" ||
      c.rank === "K"
    ) {
      sum += 10;
    } else {
      sum += parseInt(c.rank, 10);
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

export function blackjackIsNatural(cards: BJCard[]): boolean {
  return cards.length === 2 && blackjackHandValue(cards) === 21;
}

export function blackjackPlayDealer(hole: BJCard[]): BJCard[] {
  const d = [...hole];
  while (blackjackHandValue(d) < 17) {
    d.push(drawBlackjackCard());
  }
  return d;
}

export function blackjackNaturalPayout(bet: bigint, mc: bigint): bigint {
  return (bet * BigInt(250) * mc) / BigInt(10000);
}

export function blackjackWinPayout(bet: bigint, mc: bigint): bigint {
  return (bet * BigInt(2) * mc) / BigInt(100);
}

function isBJRank(s: unknown): s is BJRank {
  return typeof s === "string" && (BJ_RANKS as readonly string[]).includes(s);
}

function parseCard(raw: unknown): BJCard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = (raw as { rank?: unknown }).rank;
  return isBJRank(r) ? { rank: r } : null;
}

function parseCardArray(raw: unknown): BJCard[] | null {
  if (!Array.isArray(raw)) return null;
  const out: BJCard[] = [];
  for (const x of raw) {
    const c = parseCard(x);
    if (!c) return null;
    out.push(c);
  }
  return out;
}

export function parseWebBlackjackState(
  raw: unknown,
): WebBlackjackStoredState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.phase !== "player") return null;
  if (typeof o.bet !== "string") return null;
  if (typeof o.createdAt !== "number") return null;
  const player = parseCardArray(o.player);
  const dealer = parseCardArray(o.dealer);
  if (!player || !dealer) return null;
  return {
    bet: o.bet,
    player,
    dealer,
    phase: "player",
    createdAt: o.createdAt,
  };
}

export function serializeWebBlackjackState(
  s: WebBlackjackStoredState,
): Record<string, unknown> {
  return {
    bet: s.bet,
    player: s.player,
    dealer: s.dealer,
    phase: s.phase,
    createdAt: s.createdAt,
  };
}
