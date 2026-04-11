import type { EconomyUser } from "@prisma/client";
import type { GuildMember } from "discord.js";
import { getRebirthDisplayRolePairs } from "../../config";

/** +10% coin income per completed rebirth (basis points). */
export const REBIRTH_COIN_BPS_PER_REBIRTH = 1_000;

/** Max levels per gem-shop track. */
export const REBIRTH_SHOP_MAX = 5;

/** +5% coin income per shop level (500 bps). */
export const REBIRTH_SHOP_COIN_BPS_PER_LEVEL = 500;
/** +2% daily cash per shop level. */
export const REBIRTH_SHOP_DAILY_BPS_PER_LEVEL = 200;
/** +0.2% rob success chance per level (20 bps on probability scale 0–1). */
export const REBIRTH_SHOP_ROB_BPS_PER_LEVEL = 20;
/** +3% pet feed XP per level. */
export const REBIRTH_SHOP_PET_XP_BPS_PER_LEVEL = 300;

/** Extra gamble / pet effectiveness from rebirth tiers (additive to pet mult slice, small). */
export const REBIRTH_GAMBLE_PET_SLICE_PER_REBIRTH = 0.002;

/** Small house-game win bias per rebirth (added to p before roll, capped). */
export const REBIRTH_HOUSE_WIN_BIAS_PER_REBIRTH = 0.003;

export const REBIRTH_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export type RebirthShopState = {
  coin: number;
  daily: number;
  rob: number;
  petXp: number;
};

export function parseRebirthShop(raw: unknown): RebirthShopState {
  if (!raw || typeof raw !== "object") {
    return { coin: 0, daily: 0, rob: 0, petXp: 0 };
  }
  const o = raw as Record<string, unknown>;
  const n = (v: unknown) =>
    Math.max(0, Math.min(REBIRTH_SHOP_MAX, Math.floor(Number(v) || 0)));
  return {
    coin: n(o.coin),
    daily: n(o.daily),
    rob: n(o.rob),
    petXp: n(o.petXp),
  };
}

export function serializeRebirthShop(s: RebirthShopState): Record<string, number> {
  return { coin: s.coin, daily: s.daily, rob: s.rob, petXp: s.petXp };
}

/** Next rebirth index (1-based): current count + 1. */
export function rebirthCashRequirement(nextN: number): bigint {
  if (nextN < 1) return 0n;
  const mult = 2.85;
  return BigInt(Math.floor(50_000 * mult ** (nextN - 1)));
}

export function rebirthMsgsRequirement(nextN: number): number {
  if (nextN < 1) return 0;
  const mult = 2.35;
  return Math.floor(2_000 * mult ** (nextN - 1));
}

export function gemsEarnedOnRebirth(completedCountBefore: number): bigint {
  return BigInt(30 + completedCountBefore * 20);
}

export function rebirthShopUpgradeGemCost(
  track: keyof RebirthShopState,
  currentLevel: number,
): bigint {
  if (currentLevel >= REBIRTH_SHOP_MAX) return 0n;
  const base = track === "coin" ? 25n : track === "daily" ? 22n : 20n;
  return base + BigInt(currentLevel) * 18n;
}

export function flexRoleCoinBps(member: GuildMember | null): number {
  if (!member) return 0;
  const pairs = getRebirthDisplayRolePairs();
  let best = 0;
  for (const { tier, roleId } of pairs) {
    if (member.roles.cache.has(roleId)) {
      best = Math.max(best, 50 + tier * 25);
    }
  }
  return Math.min(400, best);
}

export function totalRebirthCoinIncomeBps(
  row: Pick<EconomyUser, "rebirthCount" | "rebirthShop">,
  member: GuildMember | null,
): number {
  const shop = parseRebirthShop(row.rebirthShop);
  const base = row.rebirthCount * REBIRTH_COIN_BPS_PER_REBIRTH;
  const fromShop = shop.coin * REBIRTH_SHOP_COIN_BPS_PER_LEVEL;
  return Math.min(
    50_000,
    base + fromShop + flexRoleCoinBps(member),
  );
}

export function applyRebirthCoinMult(delta: bigint, bps: number): bigint {
  if (delta <= 0n || bps <= 0) return delta;
  return (delta * BigInt(10_000 + bps)) / 10_000n;
}

export function boostGambleWinPayout(
  bet: bigint,
  payout: bigint,
  row: Pick<EconomyUser, "rebirthCount" | "rebirthShop">,
  member: GuildMember | null,
): bigint {
  if (payout <= bet) return payout;
  const win = payout - bet;
  const bps = totalRebirthCoinIncomeBps(row, member);
  return bet + applyRebirthCoinMult(win, bps);
}

export function rebirthGamblePetSlice(row: Pick<EconomyUser, "rebirthCount">): number {
  return Math.min(0.05, row.rebirthCount * REBIRTH_GAMBLE_PET_SLICE_PER_REBIRTH);
}

export function rebirthHouseWinBias(row: Pick<EconomyUser, "rebirthCount">): number {
  return Math.min(0.06, row.rebirthCount * REBIRTH_HOUSE_WIN_BIAS_PER_REBIRTH);
}

export function effectiveRobWinChance(
  base: number,
  row: Pick<EconomyUser, "rebirthShop">,
): number {
  const shop = parseRebirthShop(row.rebirthShop);
  const add = (shop.rob * REBIRTH_SHOP_ROB_BPS_PER_LEVEL) / 10000;
  return Math.min(0.38, Math.max(0, base + add));
}

export function dailyRewardMultBps(row: Pick<EconomyUser, "rebirthShop">): number {
  const shop = parseRebirthShop(row.rebirthShop);
  return 10_000 + shop.daily * REBIRTH_SHOP_DAILY_BPS_PER_LEVEL;
}

export function petFeedXpMultBps(row: Pick<EconomyUser, "rebirthShop">): number {
  const shop = parseRebirthShop(row.rebirthShop);
  return 10_000 + shop.petXp * REBIRTH_SHOP_PET_XP_BPS_PER_LEVEL;
}

/** Flat bank capacity bonus from rebirth tier (not shop). */
export function rebirthBankCapFlatBonus(rebirthCount: number): bigint {
  return BigInt(Math.min(40, rebirthCount)) * 50_000n;
}
