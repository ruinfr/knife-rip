import { minimalEmbed } from "../../lib/embeds";
import { formatMessageCount, formatVoiceSeconds, medalForRank } from "../../lib/guild-leaderboards/format";
import { getBotPrisma } from "../../lib/db-prisma";
import type { ArivixCommand } from "../types";

const TOP = 15;

async function memberLabel(
  guild: NonNullable<import("discord.js").Message["guild"]>,
  userId: string,
): Promise<string> {
  const m = await guild.members.fetch(userId).catch(() => null);
  if (m) return m.displayName;
  return `User ${userId}`;
}

export const lbCommand: ArivixCommand = {
  name: "lb",
  aliases: ["leaderboard", "textleaderboard", "textlb"],
  description:
    "Top members by messages sent in this server (every message counts while Arivix is online)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".lb · .leaderboard — text activity top 15",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply("Use this in a server.").catch(() => {});
      return;
    }

    const prisma = getBotPrisma();
    const rows = await prisma.botGuildMemberTextStats.findMany({
      where: { guildId: guild.id, messageCount: { gt: 0 } },
      orderBy: { messageCount: "desc" },
      take: TOP,
    });

    if (rows.length === 0) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Text leaderboard",
            description:
              "No message stats yet — counts start as soon as members send messages here while Arivix is online.",
          }),
        ],
      });
      return;
    }

    const lines: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const name = await memberLabel(guild, row.userId);
      lines.push(
        `${medalForRank(i)} ${name} — **${formatMessageCount(row.messageCount)}** messages`,
      );
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Text leaderboard",
          description: lines.join("\n"),
        }),
      ],
    });
  },
};

export const vlbCommand: ArivixCommand = {
  name: "vlb",
  aliases: ["vcleaderboard", "voiceleaderboard", "voicelb"],
  description:
    "Top members by time in voice channels (AFK excluded; counts while Arivix is online)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".vlb · .vcleaderboard — voice time top 15",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply("Use this in a server.").catch(() => {});
      return;
    }

    const prisma = getBotPrisma();
    const rows = await prisma.botGuildMemberVoiceStats.findMany({
      where: { guildId: guild.id, voiceSeconds: { gt: BigInt(0) } },
      orderBy: { voiceSeconds: "desc" },
      take: TOP,
    });

    if (rows.length === 0) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Voice leaderboard",
            description:
              "No voice time yet — VC time accumulates when members are in voice (not AFK) while Arivix is online.",
          }),
        ],
      });
      return;
    }

    const lines: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const name = await memberLabel(guild, row.userId);
      lines.push(
        `${medalForRank(i)} ${name} — **${formatVoiceSeconds(row.voiceSeconds)}**`,
      );
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Voice leaderboard",
          description: lines.join("\n"),
        }),
      ],
    });
  },
};
