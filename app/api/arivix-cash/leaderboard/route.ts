import { auth } from "@/auth";
import { queryBaltopRows } from "@/lib/economy/baltop-query";
import { formatCash } from "@/lib/economy/money";
import { queryGambleStatsLeaderboard } from "@/lib/economy/gamble-stats-query";
import { db } from "@/lib/db";
import {
  discordUserAvatarUrl,
  fetchDiscordUserAsBot,
} from "@/lib/discord";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ResolvedUser = {
  discordUserId: string;
  displayName: string;
  avatarUrl: string | null;
};

async function resolveUsers(
  botToken: string | undefined,
  ids: string[],
): Promise<Map<string, ResolvedUser>> {
  const map = new Map<string, ResolvedUser>();
  if (!botToken?.trim()) {
    for (const id of ids) {
      map.set(id, {
        discordUserId: id,
        displayName: `User ${id}`,
        avatarUrl: null,
      });
    }
    return map;
  }

  await Promise.all(
    ids.map(async (id) => {
      const u = await fetchDiscordUserAsBot(botToken, id);
      const displayName =
        u?.global_name?.trim() ||
        u?.username ||
        `User ${id}`;
      map.set(id, {
        discordUserId: id,
        displayName,
        avatarUrl: u
          ? discordUserAvatarUrl(u.id, u.avatar, 64)
          : null,
      });
    }),
  );
  return map;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tab = req.nextUrl.searchParams.get("tab") ?? "balance";
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (tab === "gamble") {
    const rows = await queryGambleStatsLeaderboard(db);
    const ids = rows.map((r) => r.discordUserId);
    const users = await resolveUsers(botToken, ids);

    return NextResponse.json({
      tab: "gamble" as const,
      rows: rows.map((r) => {
        const u = users.get(r.discordUserId);
        return {
          discordUserId: r.discordUserId,
          displayName: u?.displayName ?? r.discordUserId,
          avatarUrl: u?.avatarUrl ?? null,
          wins: r.gambleWins,
          losses: r.gambleLosses,
          netProfit: r.gambleNetProfit.toString(),
          netProfitFormatted: formatCash(r.gambleNetProfit),
          bestStreak: r.gambleBestStreak,
          currentStreak: r.gambleWinStreak,
        };
      }),
    });
  }

  const rows = await queryBaltopRows(db);
  const ids = rows.map((r) => r.discordUserId);
  const users = await resolveUsers(botToken, ids);

  return NextResponse.json({
    tab: "balance" as const,
    rows: rows.map((r) => {
      const total = r.cash + r.bankCash;
      const u = users.get(r.discordUserId);
      return {
        discordUserId: r.discordUserId,
        displayName: u?.displayName ?? r.discordUserId,
        avatarUrl: u?.avatarUrl ?? null,
        cash: r.cash.toString(),
        bankCash: r.bankCash.toString(),
        total: total.toString(),
        cashFormatted: formatCash(r.cash),
        bankCashFormatted: formatCash(r.bankCash),
        totalFormatted: formatCash(total),
      };
    }),
  });
}
