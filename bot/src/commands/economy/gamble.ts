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
    const ch = message.channel;
    const inGuildText =
      Boolean(message.guild) &&
      ch.isTextBased() &&
      !ch.isDMBased() &&
      "id" in ch;
    const originChannelId = inGuildText ? ch.id : null;

    const payload = buildGambleDisclaimerPayload({
      userId: message.author.id,
      guild: message.guild,
      originChannelId,
    });

    if (originChannelId) {
      try {
        await message.author.send({
          embeds: payload.embeds,
          components: payload.components,
        });
        await message.react("✅").catch(() => {});
        return;
      } catch {
        /* closed DMs — show disclaimer in channel */
      }
    }

    await message.reply({
      embeds: payload.embeds,
      components: payload.components,
    });
  },
};
