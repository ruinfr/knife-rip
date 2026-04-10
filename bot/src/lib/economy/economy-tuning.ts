/** Central tuning for Knife Cash expansion (work/crime/bank/business/pvp/pets). */

import { ECONOMY_BONUS_MULT } from "./config";

/** Hard cap on total gamble payout multiplier (boost + pet), applied after composition. */
export const GAMBLE_MULT_MAX = 1.28;

/** Extra payout mult from equipped pet: tier steps by XP, capped. */
export const PET_GAMBLE_BONUS_PER_STEP = 0.01;
export const PET_GAMBLE_BONUS_XP_STEP = 400;
export const PET_GAMBLE_BONUS_MAX = 0.03;
/** If happiness is here or above, equipped pet adds a small extra (still capped by PET_GAMBLE_COMBINED_MAX). */
export const PET_HAPPY_GAMBLE_THRESHOLD = 85;
export const PET_HAPPY_GAMBLE_EXTRA = 0.005;
/** Max total pet contribution (XP tiers + happiness extra). Keep modest vs GAMBLE_MULT_MAX. */
export const PET_GAMBLE_COMBINED_MAX = 0.035;

// —— Work / beg / crime ——
export const WORK_COOLDOWN_MS = 45 * 60 * 1000;
export const WORK_MIN = 8n;
export const WORK_MAX = 28n;
/** Treasury skims this fraction of gross work payout (integer percent). */
export const WORK_TREASURY_FEE_PCT = 8;

export const BEG_COOLDOWN_MS = 2 * 60 * 1000;
export const BEG_MISS_CHANCE = 0.62;
export const BEG_MIN = 1n;
export const BEG_MAX = 6n;

export const CRIME_COOLDOWN_MS = 20 * 60 * 1000;
export const CRIME_WIN_CHANCE = 0.38;
export const CRIME_WIN_MIN = 15n;
export const CRIME_WIN_MAX = 55n;
export const CRIME_LOSS_MIN = 20n;
export const CRIME_LOSS_MAX = 90n;
/** On crime fail, fine to treasury (negative EV tail). */
export const CRIME_FAIL_FINE_TO_TREASURY_MIN = 12n;
export const CRIME_FAIL_FINE_TO_TREASURY_MAX = 45n;

// —— Gathering (.mine / .fish — not casino Mines) ——
export const MINE_COOLDOWN_MS = 4 * 60 * 1000;
export const FISH_COOLDOWN_MS = 4 * 60 * 1000;
export const GATHER_MIN = 3n;
export const GATHER_MAX = 22n;

// —— Bank ——
/** Max bank balance by tier index (upgrade with `.bank upgrade`). */
export const BANK_CAP_BY_TIER: readonly bigint[] = [
  25_000n,
  100_000n,
  400_000n,
  1_500_000n,
];
export const BANK_TIER_UPGRADE_COSTS: readonly bigint[] = [
  5_000n,
  25_000n,
  100_000n,
];
/** Simple annual rate on bank (lazy); applied in tiny steps. */
export const BANK_ANNUAL_INTEREST_BPS = 120; // 1.2% / year
/** Do not accrue bank interest beyond this idle window per accrual pass. */
export const BANK_MAX_ACCRUE_MS = 14 * 24 * 60 * 60 * 1000;
export const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

// —— Business ——
export const BUSINESS_KEYS = ["lemonade", "arcade", "diner"] as const;
export type BusinessKey = (typeof BUSINESS_KEYS)[number];

/** Purchase base + tier scaling (tier 1 buy). */
export const BUSINESS_BASE_PRICES: Record<BusinessKey, bigint> = {
  lemonade: 800n,
  arcade: 2_500n,
  diner: 6_000n,
};
/** Cash per hour at tier 1 (scaled by tier). */
export const BUSINESS_RATE_PER_HOUR: Record<BusinessKey, bigint> = {
  lemonade: 12n,
  arcade: 28n,
  diner: 55n,
};
export const BUSINESS_MAX_ACCRUE_HOURS = 48;
/** Purchase tax to treasury (percent of price). */
export const BUSINESS_PURCHASE_TAX_PCT = 6;

// —— Pets ——
/** Species players can buy with `.pet buy` (shown in help). */
export const PET_BUYABLE_SPECIES = ["dog", "cat", "rabbit"] as const;
export type PetBuyableSpecies = (typeof PET_BUYABLE_SPECIES)[number];

export const PET_SPECIES: Record<
  string,
  { label: string; price: bigint; feedCost: bigint }
> = {
  dog: { label: "Dog", price: 400n, feedCost: 15n },
  cat: { label: "Cat", price: 900n, feedCost: 22n },
  rabbit: { label: "Rabbit", price: 2_200n, feedCost: 35n },
  /** Legacy keys — still honored for feed / display if already owned. */
  rat: { label: "Street rat", price: 400n, feedCost: 15n },
  crow: { label: "Lucky crow", price: 900n, feedCost: 22n },
  fox: { label: "Quick fox", price: 2_200n, feedCost: 35n },
};
export const PET_FEED_XP = 18;
export const PET_FEED_HAPPY_MIN = 8;
export const PET_FEED_HAPPY_MAX = 18;
export const PET_MAX_HAPPINESS = 100;
/** Portion of `.pet feed` / pet menu feed cost sent to treasury (rest is sink). */
export const PET_FEED_TREASURY_PCT = 25;

// —— Rob / duel / bounty ——
export const ROB_COOLDOWN_MS = 6 * 60 * 1000;
export const ROB_WIN_CHANCE = 0.32;
export const ROB_ATTEMPT_FEE = 15n;
export const ROB_STEAL_PCT_BPS = 1200; // 12% of victim wallet
export const ROB_STEAL_CAP = 400n;
export const ROB_MIN_VICTIM_CASH = 80n;
export const ROB_SUCCESS_TREASURY_FEE_PCT = 10;
export const VICTIM_ROB_COOLDOWN_MS = 12 * 60 * 1000;
export const VICTIM_DAILY_ROB_CAP = 4;
/** Victim must meet one of: min lifetime messages OR min cash. */
export const ROB_VICTIM_MIN_LIFETIME_MSGS = 120;
export const ROB_VICTIM_ALT_FLOOR_CASH = 500n;

export const DUEL_EXPIRE_MS = 300_000;
export const DUEL_RAKE_BPS = 500; // 5% of pot to treasury

export const BOUNTY_POST_FEE_PCT = 5; // on top of bounty amount
export const BOUNTY_MIN_AMOUNT = 50n;
export const BOUNTY_MAX_AMOUNT = 50_000n;

export { ECONOMY_BONUS_MULT };
