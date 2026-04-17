import { queryBaltopRows } from "../../../../lib/economy/baltop-query";
import { formatCash } from "../../lib/economy/money";
import { getBotPrisma } from "../../lib/db-prisma";
import { minimalEmbed } from "../../lib/embeds";
import { medalForRank } from "../../lib/guild-leaderboards/format";
import type { ArivixCommand } from "../types";

export const baltopCommand: ArivixCommand = {
  name: "baltop",
  aliases: ["cashtop", "richest", "leaderboardcash", "topcash", "moneylb"],
  description:
    "Global top Arivix Cash — wallet + bank + total (top 15 by total wealth)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".baltop · .cashtop · .richest · .topcash · .moneylb",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const prisma = getBotPrisma();
    const rows = await queryBaltopRows(prisma);

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
      const total = row.cash + row.bankCash;
      const user = await message.client.users
        .fetch(row.discordUserId)
        .catch(() => null);
      const tag = user?.username ?? `User ${row.discordUserId}`;
      lines.push(
        `${medalForRank(i)} ${tag} — wallet **${formatCash(row.cash)}** · bank **${formatCash(row.bankCash)}** · **${formatCash(total)}** total`,
      );
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Balance leaderboard",
          description:
            "_Global Arivix Cash — top **15** by **wallet + bank** (total > 0)._\n\n" +
            lines.join("\n"),
        }),
      ],
    });
  },
};
