import type { Prisma } from "@prisma/client";
import { getBotPrisma } from "../db-prisma";

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

export type LedgerReason =
  | "milestone"
  | "owner_add"
  | "owner_remove"
  | "owner_set"
  | "gamble"
  | "pay_send"
  | "pay_receive"
  | "shop_buy"
  | "shop_refund"
  | "luckydrop"
  | "daily"
  | "message_drop";

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
  const prisma = getBotPrisma();
  const { discordUserId, delta, reason, actorUserId, meta } = params;

  return prisma.$transaction(async (tx) => {
    const row = await tx.economyUser.upsert({
      where: { discordUserId },
      create: { discordUserId },
      update: {},
    });
    const next = row.cash + delta;
    if (next < 0n) {
      throw new Error("INSUFFICIENT_FUNDS");
    }
    await tx.economyUser.update({
      where: { discordUserId },
      data: { cash: next },
    });
    await tx.economyLedger.create({
      data: {
        discordUserId,
        delta,
        balanceAfter: next,
        reason,
        actorUserId: actorUserId ?? undefined,
        meta: meta ?? undefined,
      },
    });
    return next;
  });
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
