import type { Prisma } from "@prisma/client";
import { applyCashDeltaWithPrisma } from "../../../../lib/economy/apply-cash-delta";
import type { LedgerReason } from "../../../../lib/economy/ledger-reason";
import {
  creditGambleHouseInTx,
  creditTreasuryInTx,
} from "../../../../lib/economy/wallet-sink-in-tx";
import { GAMBLE_HOUSE_USER_ID } from "../../../../lib/economy/economy-env";
import { getBotPrisma } from "../db-prisma";

export type Tx = Prisma.TransactionClient;

export type { LedgerReason };
export { GAMBLE_HOUSE_USER_ID };
export { creditTreasuryInTx, creditGambleHouseInTx };

export async function getOrCreateEconomyUser(discordUserId: string) {
  const prisma = getBotPrisma();
  return prisma.economyUser.upsert({
    where: { discordUserId },
    create: { discordUserId },
    update: {},
  });
}

export async function getCash(discordUserId: string): Promise<bigint> {
  const u = await getOrCreateEconomyUser(discordUserId);
  return u.cash;
}

/** Persist that the user finished the Knife Cash disclaimer (hub unlock). */
export async function recordGambleDisclaimerAccepted(
  discordUserId: string,
): Promise<void> {
  const prisma = getBotPrisma();
  const now = new Date();
  await prisma.economyUser.upsert({
    where: { discordUserId },
    create: { discordUserId, gambleDisclaimerAcceptedAt: now },
    update: { gambleDisclaimerAcceptedAt: now },
  });
}

/**
 * Apply a cash delta in a transaction; rejects if balance would go negative.
 */
export async function applyCashDelta(params: {
  discordUserId: string;
  delta: bigint;
  reason: LedgerReason;
  actorUserId?: string | null;
  meta?: Prisma.InputJsonValue;
}): Promise<bigint> {
  return applyCashDeltaWithPrisma(getBotPrisma(), params);
}

/**
 * Sender pays `amount`; recipient receives `amount - tax`. Tax is removed (sink).
 */
export async function transferBetweenUsers(params: {
  fromId: string;
  toId: string;
  amount: bigint;
}): Promise<{ recipientGot: bigint; tax: bigint; newFromCash: bigint }> {
  const { fromId, toId, amount } = params;
  if (fromId === toId) throw new Error("SELF");
  if (amount <= 0n) throw new Error("BAD_AMOUNT");

  const tax = (amount * 5n) / 100n;
  const recipientGot = amount - tax;
  if (recipientGot <= 0n) throw new Error("BAD_AMOUNT");

  const prisma = getBotPrisma();

  return prisma.$transaction(async (tx) => {
    const fromRow = await tx.economyUser.findUnique({
      where: { discordUserId: fromId },
    });
    if (!fromRow || fromRow.cash < amount) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    const toRow = await tx.economyUser.upsert({
      where: { discordUserId: toId },
      create: { discordUserId: toId },
      update: {},
    });

    const newFrom = fromRow.cash - amount;
    const newTo = toRow.cash + recipientGot;

    await tx.economyUser.update({
      where: { discordUserId: fromId },
      data: { cash: newFrom, lastPayAt: new Date() },
    });
    await tx.economyUser.update({
      where: { discordUserId: toId },
      data: { cash: newTo },
    });

    await tx.economyLedger.create({
      data: {
        discordUserId: fromId,
        delta: -amount,
        balanceAfter: newFrom,
        reason: "pay_send",
        meta: { to: toId, tax: tax.toString() },
      },
    });
    await tx.economyLedger.create({
      data: {
        discordUserId: toId,
        delta: recipientGot,
        balanceAfter: newTo,
        reason: "pay_receive",
        meta: { from: fromId },
      },
    });

    if (tax > 0n) {
      await creditTreasuryInTx(tx, {
        delta: tax,
        reason: "treasury_fee",
        meta: { kind: "pay_tax", from: fromId, to: toId },
        actorUserId: fromId,
      });
    }

    return { recipientGot, tax, newFromCash: newFrom };
  });
}

export async function setCashAbsolute(params: {
  discordUserId: string;
  target: bigint;
  actorUserId: string;
}): Promise<bigint> {
  const prisma = getBotPrisma();
  const { discordUserId, target, actorUserId } = params;
  if (target < 0n) throw new Error("INVALID_TARGET");

  return prisma.$transaction(async (tx) => {
    const row = await tx.economyUser.upsert({
      where: { discordUserId },
      create: { discordUserId },
      update: {},
    });
    const delta = target - row.cash;
    await tx.economyUser.update({
      where: { discordUserId },
      data: { cash: target },
    });
    await tx.economyLedger.create({
      data: {
        discordUserId,
        delta,
        balanceAfter: target,
        reason: "owner_set",
        actorUserId,
      },
    });
    return target;
  });
}

export async function creditTreasury(params: {
  delta: bigint;
  reason: LedgerReason;
  meta?: Prisma.InputJsonValue;
  actorUserId?: string | null;
}): Promise<bigint> {
  const prisma = getBotPrisma();
  return prisma.$transaction((tx) => creditTreasuryInTx(tx, params));
}
