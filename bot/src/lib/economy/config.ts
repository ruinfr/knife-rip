/** Prefix for all economy button/modal/select custom IDs (`ke:userId:...`). */
export const ECON_INTERACTION_PREFIX = "ke:" as const;

export const DROP_INTERACTION_PREFIX = "kd:" as const;

/** Lifetime message milestones (tracked servers only). Paired with MILESTONE_REWARDS. */
export const MILESTONE_THRESHOLDS = [50, 100, 500, 1000, 3000] as const;
export const MILESTONE_REWARDS = [1, 5, 100, 300, 1000] as const;

/** Human-readable lines for Knife Cash disclaimer / docs. */
export const MILESTONE_HELP_LINES = [
  "50 msgs → +1 Cash",
  "100 msgs → +5 Cash",
  "500 msgs → +100 Cash",
  "1000 msgs → +300 Cash",
  "3000 msgs → +1000 Cash",
] as const;

/** Transfer tax (recipient receives amount × (1 - TAX_RATE)). */
export const PAY_TAX_RATE = 0.05;

export const MAX_BET_FRACTION = 0.15;

export const GAME_COOLDOWN_MS = 12_000;

export const PAY_COOLDOWN_MS = 45_000;

/** `.daily` reward and cooldown (24h from last claim). */
export const DAILY_REWARD_CASH = 50n;
export const DAILY_COOLDOWN_MS = 86_400_000;

/** +20% on payouts when user boosts a configured partner server (server1/server2/…) or Knife Pro / owner. */
export const ECONOMY_BONUS_MULT = 1.2;

export const HUB_PAGE_COUNT = 4 as const;
