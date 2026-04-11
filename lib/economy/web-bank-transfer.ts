/**
 * Web bank deposit/withdraw — mirrors bot `deposit` / `withdraw` commands.
 * Keep bank constants in sync with `bot/src/lib/economy/economy-tuning.ts` (bank section)
 * and `rebirthBankCapFlatBonus` with `bot/src/lib/economy/rebirth-mult.ts`.
 */
import type { EconomyUser } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/** Max bank balance by tier index (upgrade with `.bank upgrade` on Discord). */
export const BANK_CAP_BY_TIER: readonly bigint[] = [
  BigInt(25_000),
  BigInt(100_000),
  BigInt(400_000),
  BigInt(1_500_000),
];

export const BANK_DAILY_INTEREST_BPS = 120;
export const BANK_MAX_ACCRUE_MS = 14 * 24 * 60 * 60 * 1000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MS_PER_DAY_BI = BigInt(Math.floor(MS_PER_DAY));

function rebirthBankCapFlatBonus(rebirthCount: number): bigint {
  return BigInt(Math.min(40, rebirthCount)) * BigInt(50_000);
}

export function bankCapForTier(tier: number): bigint {
  const idx = Math.min(Math.max(0, tier), BANK_CAP_BY_TIER.length - 1);
  return BANK_CAP_BY_TIER[idx]!;
}

export function effectiveBankCapForUser(
  row: Pick<EconomyUser, "bankTier" | "rebirthCount">,
): bigint {
  return bankCapForTier(row.bankTier) + rebirthBankCapFlatBonus(row.rebirthCount);
}

function computeBankAccrual(
  row: Pick<
    EconomyUser,
    "bankCash" | "bankTier" | "lastBankInterestAt" | "rebirthCount"
  >,
  nowMs: number,
): {
  interest: bigint;
  bankAfterInterest: bigint;
  newLastBankInterestAt: Date;
} {
  const now = new Date(nowMs);
  const anchorMs = row.lastBankInterestAt?.getTime() ?? nowMs;
  let elapsed = nowMs - anchorMs;
  if (elapsed < 0) elapsed = 0;
  if (elapsed > BANK_MAX_ACCRUE_MS) elapsed = BANK_MAX_ACCRUE_MS;

  let interest = BigInt(0);
  if (row.bankCash > BigInt(0) && elapsed > 0) {
    const elapsedBi = BigInt(elapsed);
    interest =
      (row.bankCash * BigInt(BANK_DAILY_INTEREST_BPS) * elapsedBi) /
      (BigInt(10_000) * MS_PER_DAY_BI);
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
    newLastBankInterestAt: now,
  };
}

export async function applyBankInterestIfAny(
  tx: Prisma.TransactionClient,
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
  if (acc.interest <= BigInt(0)) {
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
      reason: "bank_interest",
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

async function ledgerBankMove(
  tx: Prisma.TransactionClient,
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
      reason: "bank",
      meta: meta ?? undefined,
    },
  });
}

export type WebBankTransferResult = {
  cashAfter: bigint;
  bankAfter: bigint;
  cap: bigint;
  cashFormatted: string;
  bankCashFormatted: string;
  totalFormatted: string;
};

export async function webDepositToBankInTx(
  tx: Prisma.TransactionClient,
  discordUserId: string,
  amount: bigint,
  nowMs: number,
  formatCash: (n: bigint) => string,
): Promise<WebBankTransferResult> {
  await applyBankInterestIfAny(tx, discordUserId, nowMs);
  const u = await tx.economyUser.findUnique({
    where: { discordUserId },
  });
  if (!u) throw new Error("NOUSER");
  if (u.cash < amount) throw new Error("POOR");
  const cap = effectiveBankCapForUser(u);
  const room = cap - u.bankCash;
  if (room < amount) throw new Error(`FULL:${room.toString()}`);
  const cashAfter = u.cash - amount;
  const bankAfter = u.bankCash + amount;
  await ledgerBankMove(tx, {
    discordUserId,
    cashDelta: -amount,
    bankAfter,
    cashAfter,
    meta: { op: "deposit" },
  });
  const total = cashAfter + bankAfter;
  return {
    cashAfter,
    bankAfter,
    cap,
    cashFormatted: formatCash(cashAfter),
    bankCashFormatted: formatCash(bankAfter),
    totalFormatted: formatCash(total),
  };
}

export async function webWithdrawFromBankInTx(
  tx: Prisma.TransactionClient,
  discordUserId: string,
  amount: bigint,
  nowMs: number,
  formatCash: (n: bigint) => string,
): Promise<WebBankTransferResult> {
  await applyBankInterestIfAny(tx, discordUserId, nowMs);
  const u = await tx.economyUser.findUnique({
    where: { discordUserId },
  });
  if (!u) throw new Error("NOUSER");
  if (u.bankCash < amount) throw new Error("LOW");
  const cap = effectiveBankCapForUser(u);
  const cashAfter = u.cash + amount;
  const bankAfter = u.bankCash - amount;
  await ledgerBankMove(tx, {
    discordUserId,
    cashDelta: amount,
    bankAfter,
    cashAfter,
    meta: { op: "withdraw" },
  });
  const total = cashAfter + bankAfter;
  return {
    cashAfter,
    bankAfter,
    cap,
    cashFormatted: formatCash(cashAfter),
    bankCashFormatted: formatCash(bankAfter),
    totalFormatted: formatCash(total),
  };
}
