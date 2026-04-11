import type { BusinessKey } from "./economy-tuning";
import {
  BUSINESS_AUTOMATION_EXTRA_HOURS_PER_LEVEL,
  BUSINESS_EQUIPMENT_BPS_PER_LEVEL,
  BUSINESS_MARKETING_BPS_PER_LEVEL,
  BUSINESS_MAX_ACCRUE_HOURS,
  BUSINESS_MAX_ACCRUE_HOURS_CAP,
  BUSINESS_MAX_TIER,
  BUSINESS_RATE_PER_HOUR,
  BUSINESS_TRACK_MAX_LEVEL,
} from "./economy-tuning";

export function businessSlotRowToAccrualInput(s: {
  tier: number;
  lastCollectedAt: Date;
  marketingLevel: number;
  automationLevel: number;
  staffLevel: number;
  equipmentLevel: number;
  debuffBps: number;
  debuffUntil: Date | null;
}): BusinessSlotAccrualInput {
  return {
    tier: s.tier,
    lastCollectedAt: s.lastCollectedAt,
    marketingLevel: s.marketingLevel,
    automationLevel: s.automationLevel,
    staffLevel: s.staffLevel,
    equipmentLevel: s.equipmentLevel,
    debuffBps: s.debuffBps,
    debuffUntil: s.debuffUntil,
  };
}

/** Fields needed for hourly / accrual math (matches DB slot + live event multipliers). */
export type BusinessSlotAccrualInput = {
  tier: number;
  lastCollectedAt: Date;
  marketingLevel: number;
  automationLevel: number;
  staffLevel: number;
  equipmentLevel: number;
  debuffBps: number;
  debuffUntil: Date | null;
};

export function effectiveMaxAccrueHours(automationLevel: number): number {
  const extra =
    BUSINESS_MAX_ACCRUE_HOURS +
    BUSINESS_AUTOMATION_EXTRA_HOURS_PER_LEVEL *
      Math.max(0, Math.min(BUSINESS_TRACK_MAX_LEVEL, automationLevel));
  return Math.min(BUSINESS_MAX_ACCRUE_HOURS_CAP, extra);
}

/** Hourly cash for this site before idle hours & rush (includes tier, equipment, marketing). */
export function computeBusinessHourlyRate(
  businessKey: BusinessKey,
  slot: Pick<
    BusinessSlotAccrualInput,
    "tier" | "marketingLevel" | "equipmentLevel"
  >,
): bigint {
  const base = BUSINESS_RATE_PER_HOUR[businessKey];
  const t = Math.min(Math.max(1, slot.tier), BUSINESS_MAX_TIER);
  let rate = base * BigInt(t);
  const eqLv = Math.max(
    0,
    Math.min(BUSINESS_TRACK_MAX_LEVEL, Math.floor(slot.equipmentLevel)),
  );
  const mkLv = Math.max(
    0,
    Math.min(BUSINESS_TRACK_MAX_LEVEL, Math.floor(slot.marketingLevel)),
  );
  const equipMult =
    10_000n + BigInt(BUSINESS_EQUIPMENT_BPS_PER_LEVEL) * BigInt(eqLv);
  const mktMult =
    10_000n + BigInt(BUSINESS_MARKETING_BPS_PER_LEVEL) * BigInt(mkLv);
  rate = (rate * equipMult) / 10_000n;
  rate = (rate * mktMult) / 10_000n;
  return rate;
}

/**
 * Idle cash accrued since last collect.
 * `incomeMultBps` stacks rush hour etc. (10_000 = 1×). Debuff from ignored fires applies to hourly rate.
 */
export function computeBusinessAccrued(
  businessKey: BusinessKey,
  slot: BusinessSlotAccrualInput,
  nowMs: number,
  opts?: { incomeMultBps?: number },
): bigint {
  const elapsedMs = Math.max(0, nowMs - slot.lastCollectedAt.getTime());
  const wholeHours = Math.floor(elapsedMs / 3_600_000);
  const cap = effectiveMaxAccrueHours(slot.automationLevel);
  const hours = Math.min(wholeHours, cap);
  if (hours <= 0) return 0n;

  let hourly = computeBusinessHourlyRate(businessKey, slot);
  const multBps = BigInt(
    Math.min(100_000, Math.max(1_000, opts?.incomeMultBps ?? 10_000)),
  );
  hourly = (hourly * multBps) / 10_000n;

  let debuffBps = slot.debuffBps;
  if (
    slot.debuffUntil !== null &&
    slot.debuffUntil.getTime() <= nowMs
  ) {
    debuffBps = 0;
  }
  debuffBps = Math.min(9_500, Math.max(0, debuffBps));
  if (debuffBps > 0) {
    hourly = (hourly * BigInt(10_000 - debuffBps)) / 10_000n;
  }

  return hourly * BigInt(hours);
}
