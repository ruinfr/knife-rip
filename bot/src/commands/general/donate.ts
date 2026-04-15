import { getSiteApiBase } from "../../config";
import { minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const donateCommand: KnifeCommand = {
  name: "donate",
  aliases: ["support", "tip"],
  description: "Support Arivix hosting — link to pricing and status",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".donate · .support",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const origin = getSiteApiBase();
    const pricing = `${origin}/pricing`;
    const statusUrl = `${origin}/status`;
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Support Arivix",
          description:
            `**Pricing / Pro:** [${pricing.replace(/^https?:\/\//, "")}](${pricing})\n` +
            `**Status:** [arivix.org/status](${statusUrl})\n` +
            `**Hub:** use **.arivix** for the public Discord invite.`,
        }),
      ],
    });
  },
};
