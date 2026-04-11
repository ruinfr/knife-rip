import type { Prisma } from "@prisma/client";
import {
  GAMBLE_HOUSE_USER_ID,
  getEconomyTreasuryUserId,
} from "./economy-env";
import type { LedgerReason } from "./ledger-reason";

export type Tx = Prisma.TransactionClient;

/**
 * Move `bankDelta` on a fee/house sink account’s **bank** (not wallet). Uncapped — tier limits
 * do not apply. Ledger matches `bank_interest`: `balanceAfter` is wallet cash (unchanged);
 * `meta.bankAfter` is the new bank total.
 */
async function mutateSinkBankInTx(
  tx: Tx,
  sinkUserId: string,
  params: {
    bankDelta: bigint;
    reason: LedgerReason;
    meta?: Prisma.InputJsonValue;
    actorUserId?: string | null;
  },
): Promise<bigint> {
  const { bankDelta, reason, meta, actorUserId } = params;
  await tx.economyUser.upsert({
    where: { discordUserId: sinkUserId },
    create: { discordUserId: sinkUserId },
    update: {},
  });
  const row = await tx.economyUser.findUnique({
    where: { discordUserId: sinkUserId },
  });
  if (!row) throw new Error("SINK_UPSERT");
  if (bankDelta === BigInt(0)) return row.bankCash;

  const nextBank = row.bankCash + bankDelta;
  if (nextBank < BigInt(0)) throw new Error("INSUFFICIENT_FUNDS");
  await tx.economyUser.update({
    where: { discordUserId: sinkUserId },
    data: { bankCash: nextBank },
  });
  const metaObj =
    meta !== undefined &&
    meta !== null &&
    typeof meta === "object" &&
    !Array.isArray(meta)
      ? { ...(meta as Record<string, unknown>) }
      : {};
  metaObj.bankAfter = nextBank.toString();
  await tx.economyLedger.create({
    data: {
      discordUserId: sinkUserId,
      delta: bankDelta,
      balanceAfter: row.cash,
      reason,
      meta: metaObj as Prisma.InputJsonValue,
      actorUserId: actorUserId ?? undefined,
    },
  });
  return nextBank;
}

/**
 * Credit or debit the configured treasury user’s **bank** (fees, escrow, rake — not wallet cash).
 * Use inside an existing `$transaction` when pairing with other balance moves.
 */
export async function creditTreasuryInTx(
  tx: Tx,
  params: {
    delta: bigint;
    reason: LedgerReason;
    meta?: Prisma.InputJsonValue;
    actorUserId?: string | null;
  },
): Promise<bigint> {
  const treasuryId = getEconomyTreasuryUserId();
  const { delta, reason, meta, actorUserId } = params;
  return mutateSinkBankInTx(tx, treasuryId, {
    bankDelta: delta,
    reason,
    meta,
    actorUserId,
  });
}

/**
 * Credit the house **bank** when a player’s gamble net is negative. No Discord copy.
 */
export async function creditGambleHouseInTx(
  tx: Tx,
  params: {
    delta: bigint;
    meta?: Prisma.InputJsonValue;
    actorUserId?: string | null;
  },
): Promise<bigint> {
  const { delta, meta, actorUserId } = params;
  if (delta < BigInt(0)) throw new Error("BAD_HOUSE_DELTA");
  return mutateSinkBankInTx(tx, GAMBLE_HOUSE_USER_ID, {
    bankDelta: delta,
    reason: "gamble_sink",
    meta,
    actorUserId,
  });
}
