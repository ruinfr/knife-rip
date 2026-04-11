import type { EconomyUser } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { computeBankAccrual } from "./bank-accrual";
import { BANK_CAP_BY_TIER } from "./economy-tuning";
import { rebirthBankCapFlatBonus } from "./rebirth-mult";
import type { Tx } from "./wallet";
import type { LedgerReason } from "./wallet";

export function bankCapForTier(tier: number): bigint {
  const idx = Math.min(Math.max(0, tier), BANK_CAP_BY_TIER.length - 1);
  return BANK_CAP_BY_TIER[idx]!;
}

export function effectiveBankCapForUser(
  row: Pick<EconomyUser, "bankTier" | "rebirthCount">,
): bigint {
  return bankCapForTier(row.bankTier) + rebirthBankCapFlatBonus(row.rebirthCount);
}

/**
 * Apply lazy bank interest inside a transaction; returns updated economy row fields needed for follow-up ops.
 */
export async function applyBankInterestIfAny(
  tx: Tx,
  discordUserId: string,
  nowMs: number,
): Promise<{
  cash: bigint;
  bankCash: bigint;
  bankTier: number;
  lastBankInterestAt: Date | null;
}> {
  const row = await tx.economyUser.findUnique({
    where: { discordUserId },
  });
  if (!row) {
    const created = await tx.economyUser.create({
      data: { discordUserId },
    });
    return {
      cash: created.cash,
      bankCash: created.bankCash,
      bankTier: created.bankTier,
      lastBankInterestAt: created.lastBankInterestAt,
    };
  }

  const acc = computeBankAccrual(row, nowMs);
  if (acc.interest <= 0n) {
    return {
      cash: row.cash,
      bankCash: row.bankCash,
      bankTier: row.bankTier,
      lastBankInterestAt: row.lastBankInterestAt,
    };
  }

  await tx.economyUser.update({
    where: { discordUserId },
    data: {
      bankCash: acc.bankAfterInterest,
      lastBankInterestAt: acc.newLastBankInterestAt,
    },
  });
  await tx.economyLedger.create({
    data: {
      discordUserId,
      delta: acc.interest,
      balanceAfter: row.cash,
      reason: "bank_interest" satisfies LedgerReason,
      meta: { bankAfter: acc.bankAfterInterest.toString() },
    },
  });

  return {
    cash: row.cash,
    bankCash: acc.bankAfterInterest,
    bankTier: row.bankTier,
    lastBankInterestAt: acc.newLastBankInterestAt,
  };
}

export async function ledgerBankMove(
  tx: Tx,
  params: {
    discordUserId: string;
    cashDelta: bigint;
    bankAfter: bigint;
    cashAfter: bigint;
    meta?: Prisma.InputJsonValue;
  },
): Promise<void> {
  const { discordUserId, cashDelta, bankAfter, cashAfter, meta } = params;
  await tx.economyUser.update({
    where: { discordUserId },
    data: { cash: cashAfter, bankCash: bankAfter },
  });
  await tx.economyLedger.create({
    data: {
      discordUserId,
      delta: cashDelta,
      balanceAfter: cashAfter,
      reason: "bank" satisfies LedgerReason,
      meta: meta ?? undefined,
    },
  });
}
