import { buildGambleHubPayload } from "../../lib/economy/hub-ui";
import type { KnifeCommand } from "../types";

export const gambleCommand: KnifeCommand = {
  name: "gamble",
  aliases: ["economy", "eco"],
  description:
    "Open the Knife Cash hub — shop, games, stats, and transfers (buttons)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Knife Cash (global wallet), shop, house games, and transfers — virtual currency for fun.",
    usage: ".gamble · .economy · .eco",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const payload = await buildGambleHubPayload({
      client: message.client,
      userId: message.author.id,
      page: 0,
      guild: message.guild,
    });
    await message.reply({
      embeds: payload.embeds,
      components: payload.components,
    });
  },
};
