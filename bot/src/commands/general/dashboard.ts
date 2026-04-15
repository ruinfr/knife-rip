import { getSiteApiBase } from "../../config";
import { minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const dashboardCommand: KnifeCommand = {
  name: "dashboard",
  aliases: ["dash"],
  description: "Open the web dashboard to manage Arivix (sign in with Discord)",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".dashboard · .dash",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const origin = getSiteApiBase();
    const url = `${origin}/dashboard`;
    const host = origin.replace(/^https?:\/\//, "");

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Dashboard",
          description:
            `**Manage your servers & Pro billing on the web:**\n` +
            `[${host}/dashboard](${url})\n\n` +
            `**Sign in** with Discord (same account you use here). If the link opens logged out, complete OAuth and you’ll land on your dashboard.\n\n` +
            `_Need the bot in a server? Use **\`.invite\`**._`,
        }),
      ],
    });
  },
};
