import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import type { KnifeCommand } from "../types";

export const bannerCommand: KnifeCommand = {
  name: "banner",
  aliases: ["userbanner", "bn"],
  description:
    "Show a user or server banner image (mention, ID, or yourself; use “server” for guild)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".banner [@user | user ID] · .banner server",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const mode = args[0]?.toLowerCase();

    if (mode === "server" || mode === "guild") {
      const guild = message.guild;
      if (!guild) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Use **.banner server** in a server that has a **server banner** (Boost Level 2+).",
            ),
          ],
        });
        return;
      }

      const g = await guild.fetch();
      const url = g.bannerURL({
        size: 1024,
        extension: "png",
        forceStatic: false,
      });

      if (!url) {
        await message.reply({
          embeds: [
            errorEmbed(
              "This server has **no banner** (needs Boost **Level 2** and an uploaded banner).",
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
      return;
    }

    const user = await resolveTargetUser(message, args);
    const u = await user.fetch();
    const url = u.bannerURL({
      size: 512,
      extension: "png",
      forceStatic: false,
    });

    if (!url) {
      await message.reply({
        embeds: [
          errorEmbed(
            `**${u.globalName ?? u.username}** has no profile banner set.`,
          ),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Banner — ${u.globalName ?? u.username}`,
          description: `**[Open full size](${url})**`,
          imageUrl: url,
        }),
      ],
    });
  },
};
