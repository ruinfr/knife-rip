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

/** Ordered job tiers for `.work` — promote / buy only in this chain. */
export const WORK_JOB_ORDER = [
  "intern",
  "clerk",
  "specialist",
  "director",
] as const;
export type WorkJobKey = (typeof WORK_JOB_ORDER)[number];

export type WorkMinigameKind =
  | "inbox_triage"
  | "double_dispatch"
  | "ticket_queue"
  | "exec_review";

export type WorkJobTuning = {
  label: string;
  /** Career unlock price (0 = starter). */
  price: bigint;
  minGross: bigint;
  maxGross: bigint;
  minigame: WorkMinigameKind;
};

export const WORK_JOBS: Record<WorkJobKey, WorkJobTuning> = {
  intern: {
    label: "Intern",
    price: 0n,
    minGross: WORK_MIN,
    maxGross: WORK_MAX,
    minigame: "inbox_triage",
  },
  clerk: {
    label: "Clerk",
    price: 900n,
    minGross: 14n,
    maxGross: 40n,
    minigame: "double_dispatch",
  },
  specialist: {
    label: "Specialist",
    price: 3_500n,
    minGross: 26n,
    maxGross: 58n,
    minigame: "ticket_queue",
  },
  director: {
    label: "Director",
    price: 14_000n,
    minGross: 42n,
    maxGross: 95n,
    minigame: "exec_review",
  },
};

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

/** Ordered pole tiers — buy / equip only within this chain. */
export const FISHING_POLE_ORDER = [
  "twig",
  "bamboo",
  "fiberglass",
  "deep_sea",
] as const;
export type FishingPoleKey = (typeof FISHING_POLE_ORDER)[number];

export type FishingMinigameKind =
  | "snap"
  | "double_snap"
  | "school"
  | "trophy";

export type FishingPoleTuning = {
  label: string;
  /** Shop price (0 = starter). */
  price: bigint;
  minPayout: bigint;
  maxPayout: bigint;
  minigame: FishingMinigameKind;
};

export const FISHING_POLES: Record<FishingPoleKey, FishingPoleTuning> = {
  twig: {
    label: "Twig rod",
    price: 0n,
    minPayout: GATHER_MIN,
    maxPayout: GATHER_MAX,
    minigame: "snap",
  },
  bamboo: {
    label: "Bamboo rod",
    price: 650n,
    minPayout: 8n,
    maxPayout: 38n,
    minigame: "double_snap",
  },
  fiberglass: {
    label: "Fiberglass rod",
    price: 2_400n,
    minPayout: 18n,
    maxPayout: 62n,
    minigame: "school",
  },
  deep_sea: {
    label: "Deep-sea reel",
    price: 9_500n,
    minPayout: 35n,
    maxPayout: 120n,
    minigame: "trophy",
  },
};

/** Button minigame timeout for `.fish` / `.mine` / `.work` menus. */
export const GATHER_MINIGAME_TTL_MS = 40_000;

/** Seconds — use in menu copy (e.g. "40 seconds to answer"). */
export const GATHER_MINIGAME_TTL_SEC = Math.max(
  1,
  Math.round(GATHER_MINIGAME_TTL_MS / 1000),
);

/** @deprecated Use {@link GATHER_MINIGAME_TTL_MS}. */
export const FISH_MINIGAME_TTL_MS = GATHER_MINIGAME_TTL_MS;

/** Cooldown length for menu text (e.g. "4 minutes"). */
export function formatCooldownHuman(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/** Ordered pickaxe tiers — buy / equip only within this chain. */
export const MINING_PICK_ORDER = [
  "wood",
  "stone",
  "iron",
  "diamond",
] as const;
export type MiningPickKey = (typeof MINING_PICK_ORDER)[number];

export type MiningMinigameKind =
  | "crack"
  | "vein_pair"
  | "stratum"
  | "core_rush";

export type MiningPickTuning = {
  label: string;
  /** Shop price (0 = starter). */
  price: bigint;
  minPayout: bigint;
  maxPayout: bigint;
  minigame: MiningMinigameKind;
};

export const MINING_PICKS: Record<MiningPickKey, MiningPickTuning> = {
  wood: {
    label: "Wood pickaxe",
    price: 0n,
    minPayout: GATHER_MIN,
    maxPayout: GATHER_MAX,
    minigame: "crack",
  },
  stone: {
    label: "Stone pickaxe",
    price: 650n,
    minPayout: 8n,
    maxPayout: 38n,
    minigame: "vein_pair",
  },
  iron: {
    label: "Iron pickaxe",
    price: 2_400n,
    minPayout: 18n,
    maxPayout: 62n,
    minigame: "stratum",
  },
  diamond: {
    label: "Diamond pickaxe",
    price: 9_500n,
    minPayout: 35n,
    maxPayout: 120n,
    minigame: "core_rush",
  },
};

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
/** Daily rate on bank (lazy, pro-rated by elapsed time): 120 bps = 1.2% per day. */
export const BANK_DAILY_INTEREST_BPS = 120;
/** Do not accrue bank interest beyond this idle window per accrual pass. */
export const BANK_MAX_ACCRUE_MS = 14 * 24 * 60 * 60 * 1000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// —— Business ——
/** Unlock order: buy the next in this list (linear empire). */
export const BUSINESS_KEYS = [
  "lemonade",
  "car_wash",
  "arcade",
  "food_truck",
  "diner",
  "gym",
  "movie_theater",
  "hotel",
  "airline",
  "invest_bank",
] as const;
export type BusinessKey = (typeof BUSINESS_KEYS)[number];

/** UI band for catalog copy (not the same as per-site tier level). */
export type BusinessBand = "starter" | "mid" | "high";

export const BUSINESS_BAND: Record<BusinessKey, BusinessBand> = {
  lemonade: "starter",
  car_wash: "starter",
  arcade: "starter",
  food_truck: "mid",
  diner: "mid",
  gym: "mid",
  movie_theater: "high",
  hotel: "high",
  airline: "high",
  invest_bank: "high",
};

/** Pretty names for embeds / lists. */
export const BUSINESS_DISPLAY_NAME: Record<BusinessKey, string> = {
  lemonade: "Lemonade stand",
  car_wash: "Car wash",
  arcade: "Arcade",
  food_truck: "Food truck",
  diner: "Diner",
  gym: "Gym",
  movie_theater: "Movie theater",
  hotel: "Hotel",
  airline: "Airline",
  invest_bank: "Investment bank",
};

/**
 * Tier 1 purchase base (also scales upgrade cost).
 * Upgrade to tier T+1 from tier T costs `base * T` (+ tax) before income mult.
 */
export const BUSINESS_BASE_PRICES: Record<BusinessKey, bigint> = {
  lemonade: 550n,
  car_wash: 1_200n,
  arcade: 2_800n,
  food_truck: 6_500n,
  diner: 14_000n,
  gym: 32_000n,
  movie_theater: 70_000n,
  hotel: 150_000n,
  airline: 320_000n,
  invest_bank: 680_000n,
};

/** Cash per hour at tier 1 (income = rate × tier, tier capped). */
export const BUSINESS_RATE_PER_HOUR: Record<BusinessKey, bigint> = {
  lemonade: 12n,
  car_wash: 20n,
  arcade: 28n,
  food_truck: 45n,
  diner: 55n,
  gym: 80n,
  movie_theater: 120n,
  hotel: 180n,
  airline: 300n,
  invest_bank: 500n,
};

export const BUSINESS_MAX_ACCRUE_HOURS = 48;
/** Purchase / upgrade tax to treasury (percent of price). */
export const BUSINESS_PURCHASE_TAX_PCT = 6;

/** Max franchise tier per site (income multiplier cap). */
export const BUSINESS_MAX_TIER = 10;

/** Max level per specialization track (marketing / automation / staff / equipment). */
export const BUSINESS_TRACK_MAX_LEVEL = 5;

/** +4% effective hourly rate per equipment level (additive, basis points on rate after tier). */
export const BUSINESS_EQUIPMENT_BPS_PER_LEVEL = 400;
/** +5% income per marketing level (multiplicative layer, bps). */
export const BUSINESS_MARKETING_BPS_PER_LEVEL = 500;

/** Extra max idle hours per automation level (stacks with base cap). */
export const BUSINESS_AUTOMATION_EXTRA_HOURS_PER_LEVEL = 8;
/** Hard cap on accrue hours even with automation. */
export const BUSINESS_MAX_ACCRUE_HOURS_CAP = 96;

/** Each staff level reduces inspection cash penalty by this many percentage points. */
export const BUSINESS_STAFF_INSPECTION_MITIGATE_PCT_PER_LEVEL = 12;

/** Random event roll: min ms since last roll attempt. */
export const BUSINESS_EVENT_ROLL_COOLDOWN_MS = 25 * 60 * 1000;
/** Chance to roll an event on menu refresh (permille, 0–1000). */
export const BUSINESS_EVENT_ROLL_PERMILLE = 130;

export const BUSINESS_EVENT_RUSH_MS = 10 * 60 * 1000;
export const BUSINESS_EVENT_RUSH_INCOME_MULT_BPS = 20_000; // 2.00×

export const BUSINESS_EVENT_INSPECTION_MS = 18 * 60 * 1000;
/** % of cash lost if inspection expires without Comply (before staff mitigation). */
export const BUSINESS_EVENT_INSPECTION_PENALTY_PCT = 8;
export const BUSINESS_EVENT_INSPECTION_PENALTY_CAP = 25_000n;

export const BUSINESS_EVENT_TIP_MIN_MULT_BPS = 3_000; // 0.30 × rate×tier h
export const BUSINESS_EVENT_TIP_MAX_MULT_BPS = 12_000; // 1.20 ×

export const BUSINESS_EVENT_FIRE_MS = 20 * 60 * 1000;
/** Repair cost ≈ % of site base price. */
export const BUSINESS_EVENT_FIRE_REPAIR_BASE_PCT = 14;
/** If fire ignored / times out: debuff bps on that site for 24h. */
export const BUSINESS_EVENT_FIRE_IGNORE_DEBUFF_BPS = 4_500;
export const BUSINESS_EVENT_FIRE_IGNORE_DEBUFF_MS = 24 * 60 * 60 * 1000;

/** Track upgrade price ≈ this permille of franchise base price per current level (scales up). */
export const BUSINESS_TRACK_UPGRADE_PRICE_BASE_PERMILLE = 55;
export const BUSINESS_TRACK_UPGRADE_PRICE_PER_LEVEL_PERMILLE = 35;

export function parseBusinessKey(s: string): BusinessKey | null {
  if ((BUSINESS_KEYS as readonly string[]).includes(s)) return s as BusinessKey;
  return null;
}

// —— Pets ——
/** Species players can buy with `.pet buy` (shown in help). */
export const PET_BUYABLE_SPECIES = ["dog", "cat", "rabbit"] as const;
export type PetBuyableSpecies = (typeof PET_BUYABLE_SPECIES)[number];

/** Per species: shop row + feed gains + small .gamble pet bonus scaling (pricier = slightly stronger). */
export type PetSpeciesEconomy = {
  label: string;
  price: bigint;
  feedCost: bigint;
  feedXp: number;
  feedHappyMin: number;
  feedHappyMax: number;
  /** Added after XP + happiness slices, before per-species cap. */
  gambleBonusFlat: number;
  /** Ceiling for this pet’s total gamble bonus (XP path + happy + flat). */
  gambleBonusCap: number;
};

export const PET_SPECIES: Record<string, PetSpeciesEconomy> = {
  dog: {
    label: "Dog",
    price: 400n,
    feedCost: 15n,
    feedXp: 18,
    feedHappyMin: 8,
    feedHappyMax: 18,
    gambleBonusFlat: 0,
    gambleBonusCap: PET_GAMBLE_COMBINED_MAX,
  },
  cat: {
    label: "Cat",
    price: 900n,
    feedCost: 22n,
    feedXp: 20,
    feedHappyMin: 9,
    feedHappyMax: 19,
    gambleBonusFlat: 0.001,
    gambleBonusCap: 0.037,
  },
  rabbit: {
    label: "Rabbit",
    price: 2_200n,
    feedCost: 35n,
    feedXp: 22,
    feedHappyMin: 10,
    feedHappyMax: 20,
    gambleBonusFlat: 0.002,
    gambleBonusCap: 0.039,
  },
  /** Legacy keys — same tuning as the matching tier. */
  rat: {
    label: "Street rat",
    price: 400n,
    feedCost: 15n,
    feedXp: 18,
    feedHappyMin: 8,
    feedHappyMax: 18,
    gambleBonusFlat: 0,
    gambleBonusCap: PET_GAMBLE_COMBINED_MAX,
  },
  crow: {
    label: "Lucky crow",
    price: 900n,
    feedCost: 22n,
    feedXp: 20,
    feedHappyMin: 9,
    feedHappyMax: 19,
    gambleBonusFlat: 0.001,
    gambleBonusCap: 0.037,
  },
  fox: {
    label: "Quick fox",
    price: 2_200n,
    feedCost: 35n,
    feedXp: 22,
    feedHappyMin: 10,
    feedHappyMax: 20,
    gambleBonusFlat: 0.002,
    gambleBonusCap: 0.039,
  },
  /** Rebirth ≥3 exclusive — `.pet buy phoenix` */
  phoenix: {
    label: "Ash phoenix",
    price: 25_000n,
    feedCost: 80n,
    feedXp: 28,
    feedHappyMin: 12,
    feedHappyMax: 22,
    gambleBonusFlat: 0.004,
    gambleBonusCap: 0.045,
  },
};

/** Minimum rebirths to adopt {@link PET_SPECIES.phoenix}. */
export const PET_REBIRTH_EXCLUSIVE_MIN = 3 as const;

/** Dog baseline — prefer {@link petFeedXpFor} / {@link PET_SPECIES}. */
export const PET_FEED_XP = 18;
export const PET_FEED_HAPPY_MIN = 8;
export const PET_FEED_HAPPY_MAX = 18;

export function petFeedXpFor(speciesKey: string): number {
  return PET_SPECIES[speciesKey]?.feedXp ?? PET_FEED_XP;
}

export function rollPetFeedHappyGain(speciesKey: string): number {
  const row = PET_SPECIES[speciesKey];
  const lo = row?.feedHappyMin ?? PET_FEED_HAPPY_MIN;
  const hi = row?.feedHappyMax ?? PET_FEED_HAPPY_MAX;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function petGambleTuningFor(speciesKey: string): {
  flat: number;
  cap: number;
} {
  const row = PET_SPECIES[speciesKey];
  return {
    flat: row?.gambleBonusFlat ?? 0,
    cap: row?.gambleBonusCap ?? PET_GAMBLE_COMBINED_MAX,
  };
}

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
