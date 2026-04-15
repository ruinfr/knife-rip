import { getSiteApiBase } from "../../config";
import { minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const creditsCommand: KnifeCommand = {
  name: "credits",
  aliases: ["team"],
  description:
    "Team and contributors — link to the hidden credits page on the Arivix site",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".credits · .team",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const origin = getSiteApiBase();
    const creditsUrl = `${origin}/credits`;
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Credits",
          description:
            `People behind **Arivix** — thanks for using the bot.\n\n` +
            `**[Team & contributors](${creditsUrl})**\n\n` +
            `_This page isn’t linked in the site navigation — share it if you like._`,
        }),
      ],
    });
  },
};
