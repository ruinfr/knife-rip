import type { EconomyUser } from "@prisma/client";
import {
  BANK_CAP_BY_TIER,
  BANK_DAILY_INTEREST_BPS,
  BANK_MAX_ACCRUE_MS,
  MS_PER_DAY,
} from "./economy-tuning";
import { rebirthBankCapFlatBonus } from "./rebirth-mult";

const MS_PER_DAY_BI = BigInt(Math.floor(MS_PER_DAY));

export type BankAccrualResult = {
  interest: bigint;
  bankAfterInterest: bigint;
  cappedToTier: bigint;
  newLastBankInterestAt: Date;
};

/**
 * Lazy bank interest since `lastBankInterestAt` (or now if null). Does not write DB.
 */
export function computeBankAccrual(
  row: Pick<
    EconomyUser,
    "bankCash" | "bankTier" | "lastBankInterestAt" | "rebirthCount"
  >,
  nowMs: number,
): BankAccrualResult {
  const now = new Date(nowMs);
  const anchorMs = row.lastBankInterestAt?.getTime() ?? nowMs;
  let elapsed = nowMs - anchorMs;
  if (elapsed < 0) elapsed = 0;
  if (elapsed > BANK_MAX_ACCRUE_MS) elapsed = BANK_MAX_ACCRUE_MS;

  let interest = 0n;
  if (row.bankCash > 0n && elapsed > 0) {
    const elapsedBi = BigInt(elapsed);
    interest =
      (row.bankCash * BigInt(BANK_DAILY_INTEREST_BPS) * elapsedBi) /
      (10000n * MS_PER_DAY_BI);
  }

  const rawAfter = row.bankCash + interest;
  const tierCap =
    BANK_CAP_BY_TIER[Math.min(row.bankTier, BANK_CAP_BY_TIER.length - 1)]!;
  const cap = tierCap + rebirthBankCapFlatBonus(row.rebirthCount);
  const cappedToTier = rawAfter > cap ? cap : rawAfter;
  const finalInterest = cappedToTier - row.bankCash;

  return {
    interest: finalInterest,
    bankAfterInterest: cappedToTier,
    cappedToTier,
    newLastBankInterestAt: now,
  };
}
