import { getBotPrisma } from "../../lib/db-prisma";
import {
  buildGambleDisclaimerPayload,
  buildGambleDisclaimerPromptPayload,
  buildGambleHubPayload,
  gambleHubPingContent,
} from "../../lib/economy/hub-ui";
import type { KnifeCommand } from "../types";

export const gambleCommand: KnifeCommand = {
  name: "gamble",
  aliases: ["economy", "eco", "bet", "casino"],
  description:
    "Arivix Cash — private disclaimer in channel, then hub (shop, games, stats, pay)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".gamble · .economy · .eco · .bet · .casino",
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
    const uid = message.author.id;

    const prisma = getBotPrisma();
    const disclaimerRow = await prisma.economyUser.findUnique({
      where: { discordUserId: uid },
      select: { gambleDisclaimerAcceptedAt: true },
    });
    if (disclaimerRow?.gambleDisclaimerAcceptedAt) {
      const payload = await buildGambleHubPayload({
        client: message.client,
        userId: uid,
        page: 0,
        guild: message.guild ?? null,
      });
      await message.reply({
        content: gambleHubPingContent(uid),
        embeds: payload.embeds,
        components: payload.components,
        allowedMentions: { users: [uid] },
      });
      return;
    }

    if (inGuildText) {
      const prompt = buildGambleDisclaimerPromptPayload(uid);
      await message.reply({
        content: prompt.content,
        embeds: prompt.embeds,
        components: prompt.components,
        allowedMentions: { users: [uid] },
      });
      return;
    }

    const payload = buildGambleDisclaimerPayload({
      userId: uid,
      guild: null,
      originChannelId: null,
    });
    await message.reply({
      embeds: payload.embeds,
      components: payload.components,
    });
  },
};
