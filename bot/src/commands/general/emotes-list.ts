import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

export const emotesCommand: ArivixCommand = {
  name: "emotes",
  aliases: ["emojis", "serveremotes", "serveremojis"],
  description: "List custom emojis in this server",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server insight.",
    usage: ".emotes",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.emotes** in a server.")],
      });
      return;
    }

    const list = [...guild.emojis.cache.values()].map(
      (e) => `${e.toString()} — \`${e.name}\``,
    );

    const body =
      list.length > 0 ? list.join(" ").slice(0, 3900) : "*No custom emojis*";

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`Emojis — ${guild.name}`)
          .setDescription(body)
          .setFooter({ text: `${guild.emojis.cache.size} emojis` }),
      ],
    });
  },
};
