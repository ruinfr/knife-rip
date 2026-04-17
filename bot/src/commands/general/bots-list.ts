import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

export const botsCommand: ArivixCommand = {
  name: "bots",
  aliases: ["botlist"],
  description: "List bot accounts currently visible in the member cache",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server insight.",
    usage: ".bots",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.bots** in a server.")],
      });
      return;
    }

    try {
      if (guild.memberCount < 5000) {
        await guild.members.fetch().catch(() => {});
      }
    } catch {
      /* ignore */
    }

    const bots = [...guild.members.cache.values()].filter((m) => m.user.bot);
    const lines = bots
      .sort((a, b) => a.user.username.localeCompare(b.user.username))
      .slice(0, 40)
      .map((m) => `**${m.user.tag}** — \`${m.id}\``);

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`Bots — ${guild.name}`)
          .setDescription(
            lines.length > 0
              ? lines.join("\n").slice(0, 3900)
              : "*No bots in cache*",
          )
          .setFooter({ text: `${bots.length} bots in cache` }),
      ],
    });
  },
};
