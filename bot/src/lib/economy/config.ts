/** Prefix for all economy button/modal/select custom IDs (`ke:userId:...`). */
export const ECON_INTERACTION_PREFIX = "ke:" as const;

export const DROP_INTERACTION_PREFIX = "kd:" as const;

/** Cash for each 50 lifetime messages (50, 100, 150, …). */
export const MILESTONE_STACK_50_CASH = 10;
/** Extra cash on each 100 boundary (100, 200, 300, …), on top of the +10 for that step. */
export const MILESTONE_STACK_100_EXTRA_CASH = 50;

/** One-time bonuses after the repeating 50/100 stack. Paired with MILESTONE_HIGH_REWARDS. */
export const MILESTONE_HIGH_THRESHOLDS = [500, 1000, 3000] as const;
export const MILESTONE_HIGH_REWARDS = [500, 2500, 8000] as const;

/** Human-readable lines for Arivix Cash disclaimer — message cash stack + high tiers. */
export const MILESTONE_HELP_LINES: readonly string[] = [
  `Every **50** msgs → **+${MILESTONE_STACK_50_CASH}** (stacks at **50, 100, 150…**)`,
  `Every **100** msgs → **+${MILESTONE_STACK_100_EXTRA_CASH}** extra (**100, 200…**)`,
  `At **500** → **+500** · **1,000** → **+2,500** · **3,000** → **+8,000**`,
];

/** Transfer tax (recipient receives amount × (1 - TAX_RATE)). */
export const PAY_TAX_RATE = 0.05;

export const MAX_BET_FRACTION = 0.15;

export const GAME_COOLDOWN_MS = 12_000;

export const PAY_COOLDOWN_MS = 45_000;

/** `.daily` reward and cooldown (24h from last claim). */
export const DAILY_REWARD_CASH = 50n;
export const DAILY_COOLDOWN_MS = 86_400_000;

/** +20% on payouts when user boosts a configured partner server (server1/server2/…) or Arivix Pro / owner. */
export const ECONOMY_BONUS_MULT = 1.2;

export const HUB_PAGE_COUNT = 4 as const;
