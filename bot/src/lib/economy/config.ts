/** Prefix for all economy button/modal/select custom IDs (`ke:userId:...`). */
export const ECON_INTERACTION_PREFIX = "ke:" as const;

export const DROP_INTERACTION_PREFIX = "kd:" as const;

export const MILESTONE_THRESHOLDS = [100, 500, 1000, 3000] as const;
export const MILESTONE_REWARDS = [5, 100, 300, 1000] as const;

/** Transfer tax (recipient receives amount × (1 - TAX_RATE)). */
export const PAY_TAX_RATE = 0.05;

export const MAX_BET_FRACTION = 0.15;

export const GAME_COOLDOWN_MS = 12_000;

export const PAY_COOLDOWN_MS = 45_000;

/** +20% on payouts when user has Nitro boost in current guild or Knife Pro / owner. */
export const ECONOMY_BONUS_MULT = 1.2;

export const HUB_PAGE_LABELS = [
  "🛒 Shop",
  "🎰 Games",
  "📊 Stats",
  "💸 Pay",
] as const;

export const HUB_PAGE_COUNT = 4 as const;
