import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const rolesCommand: KnifeCommand = {
  name: "roles",
  aliases: ["rolelist"],
  description: "List roles in the server (position order)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server insight.",
    usage: ".roles",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.roles** in a server.")],
      });
      return;
    }

    const list = [...guild.roles.cache.values()]
      .filter((r) => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => `${r.name} — \`${r.id}\``);

    const body =
      list.length > 0 ? list.join("\n").slice(0, 3900) : "*No roles*";

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`Roles — ${guild.name}`)
          .setDescription(body)
          .setFooter({ text: `${list.length} roles` }),
      ],
    });
  },
};
