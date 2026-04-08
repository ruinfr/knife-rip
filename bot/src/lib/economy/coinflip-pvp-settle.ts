import type { Prisma } from "@prisma/client";
import { getBotPrisma } from "../db-prisma";

export type SettleCoinflipPvpResult = {
  headsChallengerWins: boolean;
  winnerId: string;
  loserId: string;
  bet: bigint;
  challengerId: string;
  opponentId: string;
};

/**
 * Atomic PVP coinflip: both must have cash ≥ bet; loser −bet, winner +bet; challenge → completed.
 */
export async function settleCoinflipPvpChallenge(
  challengeId: string,
): Promise<SettleCoinflipPvpResult> {
  const prisma = getBotPrisma();
  return prisma.$transaction(async (tx) => {
    const ch = await tx.economyCoinflipPvpChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!ch) throw new Error("NOT_FOUND");
    if (ch.status !== "pending") throw new Error("NOT_PENDING");
    if (ch.expiresAt.getTime() < Date.now()) {
      await tx.economyCoinflipPvpChallenge.update({
        where: { id: challengeId },
        data: { status: "expired" },
      });
      throw new Error("EXPIRED");
    }

    const { challengerDiscordId: cId, opponentDiscordId: oId, bet } = ch;

    const cRow = await tx.economyUser.upsert({
      where: { discordUserId: cId },
      create: { discordUserId: cId },
      update: {},
    });
    const oRow = await tx.economyUser.upsert({
      where: { discordUserId: oId },
      create: { discordUserId: oId },
      update: {},
    });
    if (cRow.cash < bet) throw new Error("INSUFFICIENT_CHALLENGER");
    if (oRow.cash < bet) throw new Error("INSUFFICIENT_OPPONENT");

    const headsChallengerWins = Math.random() < 0.5;
    const winnerId = headsChallengerWins ? cId : oId;
    const loserId = headsChallengerWins ? oId : cId;

    const loserCashBefore = loserId === cId ? cRow.cash : oRow.cash;
    const winnerCashBefore = winnerId === cId ? cRow.cash : oRow.cash;
    const loserAfter = loserCashBefore - bet;
    const winnerAfter = winnerCashBefore + bet;
    if (loserAfter < 0n) throw new Error("INSUFFICIENT_FUNDS");

    await tx.economyUser.update({
      where: { discordUserId: loserId },
      data: { cash: loserAfter },
    });
    await tx.economyUser.update({
      where: { discordUserId: winnerId },
      data: { cash: winnerAfter },
    });

    const metaLoser: Prisma.InputJsonValue = {
      challengeId,
      role: "loser",
      challengerId: cId,
      opponentId: oId,
    };
    const metaWinner: Prisma.InputJsonValue = {
      challengeId,
      role: "winner",
      challengerId: cId,
      opponentId: oId,
    };

    await tx.economyLedger.create({
      data: {
        discordUserId: loserId,
        delta: -bet,
        balanceAfter: loserAfter,
        reason: "pvp_coinflip",
        meta: metaLoser,
      },
    });
    await tx.economyLedger.create({
      data: {
        discordUserId: winnerId,
        delta: bet,
        balanceAfter: winnerAfter,
        reason: "pvp_coinflip",
        meta: metaWinner,
      },
    });

    await tx.economyCoinflipPvpChallenge.update({
      where: { id: challengeId },
      data: {
        status: "completed",
        winnerDiscordId: winnerId,
        outcomeHeads: headsChallengerWins,
      },
    });

    return {
      headsChallengerWins,
      winnerId,
      loserId,
      bet,
      challengerId: cId,
      opponentId: oId,
    };
  });
}
