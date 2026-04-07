import type { EconomyUser } from "@prisma/client";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Within an open Prisma transaction: update balance, stats, ledger, gamble log.
 * Caller must have verified `row.cash >= bet` (or equivalent) before calling.
 */
export async function applyGambleOutcomeInTx(
  tx: Tx,
  row: EconomyUser,
  params: {
    userId: string;
    bet: bigint;
    payout: bigint;
    game: string;
  },
): Promise<{ net: bigint; newCash: bigint }> {
  const { userId, bet, payout, game } = params;
  const newCash = row.cash - bet + payout;
  if (newCash < 0n) throw new Error("INSUFFICIENT_FUNDS");

  const net = payout - bet;
  const winInc = payout > bet ? 1 : 0;
  const lossInc = payout === 0n ? 1 : 0;
  const newStreak =
    payout > bet
      ? row.gambleWinStreak + 1
      : payout === bet
        ? row.gambleWinStreak
        : 0;
  const best = Math.max(row.gambleBestStreak, newStreak);

  await tx.economyUser.update({
    where: { discordUserId: userId },
    data: {
      cash: newCash,
      gambleWins: { increment: winInc },
      gambleLosses: { increment: lossInc },
      gambleNetProfit: { increment: net },
      gambleWinStreak: newStreak,
      gambleBestStreak: best,
    },
  });

  await tx.economyLedger.create({
    data: {
      discordUserId: userId,
      delta: net,
      balanceAfter: newCash,
      reason: "gamble",
      meta: { game, bet: bet.toString(), payout: payout.toString() },
    },
  });

  await tx.economyGambleLog.create({
    data: {
      discordUserId: userId,
      game,
      bet,
      payout,
      won: winInc > 0,
    },
  });

  return { net, newCash };
}
