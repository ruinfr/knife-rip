import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import type { KnifeCommand } from "../types";

export const boostersCommand: KnifeCommand = {
  name: "boosters",
  aliases: ["boostlist", "nitroboosters"],
  description: "List current server boosters or recent lost boosts (tracked while bot is online)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server insight.",
    usage: ".boosters · .boosters lost",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.boosters** in a server.")],
      });
      return;
    }

    if (args[0]?.toLowerCase() === "lost") {
      try {
        const prisma = getBotPrisma();
        const rows = await prisma.botGuildBoosterEvent.findMany({
          where: { guildId: guild.id, kind: "lost" },
          orderBy: { at: "desc" },
          take: 15,
        });
        if (rows.length === 0) {
          await message.reply({
            embeds: [
              errorEmbed(
                "No recorded **lost** boost events yet — the bot logs changes while it is running.",
              ),
            ],
          });
          return;
        }
        const lines: string[] = [];
        for (const r of rows) {
          const t = Math.floor(r.at.getTime() / 1000);
          lines.push(`<@${r.userId}> — <t:${t}:R>`);
        }
        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2b2d31)
              .setTitle("Recent lost boosts")
              .setDescription(lines.join("\n")),
          ],
        });
      } catch {
        await message.reply({
          embeds: [
            errorEmbed(
              "Database unavailable — lost boost history could not be loaded.",
            ),
          ],
        });
      }
      return;
    }

    try {
      if (guild.memberCount < 5000) {
        await guild.members.fetch().catch(() => {});
      }
    } catch {
      /* ignore */
    }

    const boosting = [...guild.members.cache.values()]
      .filter((m) => m.premiumSince)
      .sort(
        (a, b) =>
          (b.premiumSince?.getTime() ?? 0) - (a.premiumSince?.getTime() ?? 0),
      );

    if (boosting.length === 0) {
      await message.reply({
        embeds: [
          errorEmbed("No active boosters found in the member cache."),
        ],
      });
      return;
    }

    const lines = boosting.slice(0, 20).map((m) => {
      const t = Math.floor((m.premiumSince?.getTime() ?? 0) / 1000);
      return `${m.user.tag} — since <t:${t}:D>`;
    });

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf47fff)
          .setTitle(`Boosters — ${guild.name}`)
          .setDescription(lines.join("\n").slice(0, 3900))
          .setFooter({ text: `${boosting.length} boosting` }),
      ],
    });
  },
};
