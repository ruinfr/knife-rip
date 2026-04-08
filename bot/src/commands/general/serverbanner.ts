import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { resolveGuildByInput } from "../../lib/resolve-guild-by-input";
import type { KnifeCommand } from "../types";

/** Guild boost banner (not user profile banner). Optional guild ID. */
export const serverbannerCommand: KnifeCommand = {
  name: "serverbanner",
  aliases: ["sbanner"],
  description:
    "Guild server banner (Boost Level 2+). Optional guild ID the bot shares.",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server assets.",
    usage: ".serverbanner [guild ID]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = await resolveGuildByInput(
      message.client,
      args[0],
      message.guild,
    );
    if (!guild) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Use **.serverbanner** in a server, or pass a **guild ID** the bot is in.",
          ),
        ],
      });
      return;
    }

    const g = await guild.fetch().catch(() => guild);
    const url = g.bannerURL({ size: 2048 });

    if (!url) {
      await message.reply({
        embeds: [
          errorEmbed(
            "This server has **no banner** (needs Boost **Level 2**).",
          ),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Server banner — ${g.name}`,
          description: `**[Open full size](${url})**`,
          imageUrl: url,
        }),
      ],
    });
  },
};
