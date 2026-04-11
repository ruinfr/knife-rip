import type { Prisma, PrismaClient } from "@prisma/client";
import type { LedgerReason } from "./ledger-reason";

export type { LedgerReason };

/**
 * Apply a cash delta in a transaction; rejects if balance would go negative.
 * Use with site `db` or bot `getBotPrisma()`.
 */
export async function applyCashDeltaWithPrisma(
  prisma: PrismaClient,
  params: {
    discordUserId: string;
    delta: bigint;
    reason: LedgerReason;
    actorUserId?: string | null;
    meta?: Prisma.InputJsonValue;
  },
): Promise<bigint> {
  const { discordUserId, delta, reason, actorUserId, meta } = params;

  return prisma.$transaction(async (tx) => {
    const row = await tx.economyUser.upsert({
      where: { discordUserId },
      create: { discordUserId },
      update: {},
    });
    const next = row.cash + delta;
    if (next < BigInt(0)) {
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
