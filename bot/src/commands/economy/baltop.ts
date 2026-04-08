import { formatCash } from "../../lib/economy/money";
import { getBotPrisma } from "../../lib/db-prisma";
import { minimalEmbed } from "../../lib/embeds";
import { medalForRank } from "../../lib/guild-leaderboards/format";
import type { KnifeCommand } from "../types";

const TOP = 15;

export const baltopCommand: KnifeCommand = {
  name: "baltop",
  aliases: ["cashtop", "richest", "leaderboardcash"],
  description:
    "Global top Knife Cash balances (same wallet as .gamble / .cash — top 15)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Knife Cash (global wallet), shop, house games, and transfers — virtual currency for fun.",
    usage: ".baltop · .cashtop · .richest",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const prisma = getBotPrisma();
    const rows = await prisma.economyUser.findMany({
      where: { cash: { gt: 0n } },
      orderBy: { cash: "desc" },
      take: TOP,
      select: { discordUserId: true, cash: true },
    });

    if (rows.length === 0) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Balance leaderboard",
            description:
              "No balances yet — play games, claim **.daily**, or earn milestones.",
          }),
        ],
      });
      return;
    }

    const lines: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const user = await message.client.users
        .fetch(row.discordUserId)
        .catch(() => null);
      const tag = user?.username ?? `User ${row.discordUserId}`;
      lines.push(
        `${medalForRank(i)} ${tag} — **${formatCash(row.cash)}**`,
      );
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Balance leaderboard",
          description:
            "_Global Knife Cash — top **15** with balance above zero._\n\n" +
              lines.join("\n"),
        }),
      ],
    });
  },
};
