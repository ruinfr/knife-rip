import { getBotPrisma } from "../../lib/db-prisma";
import { FISH_COOLDOWN_MS } from "../../lib/economy/economy-tuning";
import {
  buildFishMenuEmbed,
  buildFishMenuRows,
  normalizeOwnedPoles,
  parseFishingPoleKey,
} from "../../lib/economy/fish-flow";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { errorEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

export const fishCommand: ArivixCommand = {
  name: "fish",
  aliases: ["fishing", "catch"],
  description:
    "Arivix Cash — fishing menu: rods, shop upgrades, and pole-specific catch minigames",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".fish · .fishing · .catch",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.fish`** in a **server text channel** (not DMs)."),
        ],
      });
      return;
    }

    const uid = message.author.id;
    const prisma = getBotPrisma();

    try {
      const u = await prisma.economyUser.upsert({
        where: { discordUserId: uid },
        create: { discordUserId: uid },
        update: {},
      });
      const equipped =
        parseFishingPoleKey(u.fishingPoleEquipped ?? "twig") ?? "twig";
      const owned = normalizeOwnedPoles(u.fishingPolesOwned);
      let cdEnd: number | null = null;
      if (u.lastFishAt) {
        cdEnd = u.lastFishAt.getTime() + FISH_COOLDOWN_MS;
      }
      const embed = await buildFishMenuEmbed({
        userId: uid,
        equipped,
        owned,
        cash: u.cash,
        cooldownEndsAt: cdEnd,
      });
      await message.reply({
        content: `<@${uid}>`,
        embeds: [embed],
        components: buildFishMenuRows({ userId: uid, equipped, owned }),
        allowedMentions: { users: [uid] },
      });
    } catch {
      await message.reply({
        embeds: [
          errorEmbed(
            "Fishing menu could not load (database or migration). Ask an admin to run **Prisma migrations** and restart the bot.",
            { title: "Can't open fishing" },
          ),
        ],
      });
    }
  },
};
