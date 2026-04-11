import { db } from "@/lib/db";
import { fetchDiscordUserAsBot } from "@/lib/discord";
import {
  formatProfitForRecentWin,
  labelForGambleGameKey,
  maskPlayerTag,
} from "@/lib/economy/knife-cash-recent-wins";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TAKE = 28;

export async function GET() {
  const rows = await db.economyGambleLog.findMany({
    where: {
      won: true,
      payout: { gt: BigInt(0) },
    },
    orderBy: { createdAt: "desc" },
    take: TAKE,
    select: {
      discordUserId: true,
      game: true,
      bet: true,
      payout: true,
      createdAt: true,
    },
  });

  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const uniqueIds = [...new Set(rows.map((r) => r.discordUserId))];
  const nameMap = new Map<string, string>();

  /** Avoid Discord rate limits — resolve a subset; others show as “Player”. */
  const toResolve = uniqueIds.slice(0, 12);
  if (token) {
    for (let i = 0; i < toResolve.length; i += 4) {
      const chunk = toResolve.slice(i, i + 4);
      await Promise.all(
        chunk.map(async (id) => {
          const u = await fetchDiscordUserAsBot(token, id);
          if (u?.username) nameMap.set(id, u.username);
        }),
      );
    }
  }

  return NextResponse.json({
    wins: rows.map((r) => ({
      game: labelForGambleGameKey(r.game),
      player: maskPlayerTag(nameMap.get(r.discordUserId) ?? null),
      profit: formatProfitForRecentWin(r.bet, r.payout),
      at: r.createdAt.toISOString(),
    })),
  });
}
