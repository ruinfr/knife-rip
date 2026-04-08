import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const membercountCommand: KnifeCommand = {
  name: "membercount",
  aliases: ["memberscount", "mc"],
  description: "Member counts for this server (when cache is complete)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server insight.",
    usage: ".membercount",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.membercount** in a server.")],
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

    let humans = 0;
    let bots = 0;
    for (const m of guild.members.cache.values()) {
      if (m.user.bot) bots += 1;
      else humans += 1;
    }
    const total = guild.memberCount ?? guild.members.cache.size;
    const complete =
      guild.memberCount != null &&
      guild.members.cache.size === guild.memberCount;

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`Members — ${guild.name}`)
          .setDescription(
            `**Total:** ${total.toLocaleString()}\n` +
              (complete
                ? `**Humans:** ${humans.toLocaleString()}\n**Bots:** ${bots.toLocaleString()}`
                : "*Humans/bots split may be incomplete until members are cached.*"),
          ),
      ],
    });
  },
};
