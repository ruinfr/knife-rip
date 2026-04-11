import type { PrismaClient } from "@prisma/client";

export type GambleStatsRow = {
  discordUserId: string;
  gambleWins: number;
  gambleLosses: number;
  gambleNetProfit: bigint;
  gambleWinStreak: number;
  gambleBestStreak: number;
};

/** Top players by recorded gamble net profit (same DB as Discord hub stats). */
export async function queryGambleStatsLeaderboard(
  prisma: PrismaClient,
  take = 15,
): Promise<GambleStatsRow[]> {
  return prisma.economyUser.findMany({
    where: {
      OR: [{ gambleWins: { gt: 0 } }, { gambleLosses: { gt: 0 } }],
    },
    orderBy: { gambleNetProfit: "desc" },
    take,
    select: {
      discordUserId: true,
      gambleWins: true,
      gambleLosses: true,
      gambleNetProfit: true,
      gambleWinStreak: true,
      gambleBestStreak: true,
    },
  });
}
