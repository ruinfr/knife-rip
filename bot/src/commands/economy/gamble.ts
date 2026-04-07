import { buildGambleDisclaimerPayload } from "../../lib/economy/hub-ui";
import type { KnifeCommand } from "../types";

export const gambleCommand: KnifeCommand = {
  name: "gamble",
  aliases: ["economy", "eco"],
  description:
    "Knife Cash — disclaimer + confirm, then hub (shop, games, stats, pay)",
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
    const payload = buildGambleDisclaimerPayload({
      userId: message.author.id,
      guild: message.guild,
    });
    await message.reply({
      embeds: payload.embeds,
      components: payload.components,
    });
  },
};
