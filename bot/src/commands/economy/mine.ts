import { getBotPrisma } from "../../lib/db-prisma";
import { MINE_COOLDOWN_MS } from "../../lib/economy/economy-tuning";
import {
  buildMineMenuEmbed,
  buildMineMenuRows,
  normalizeOwnedPicks,
  parseMiningPickKey,
} from "../../lib/economy/mine-flow";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { errorEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const mineCommand: KnifeCommand = {
  name: "mine",
  aliases: ["mining", "dig"],
  description:
    "Knife Cash — mining menu: pickaxes, upgrades, and pick-specific ore minigames (not casino Mines)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".mine · .mining · .dig",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.mine`** in a **server text channel** (not DMs)."),
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
        parseMiningPickKey(u.miningPickEquipped ?? "wood") ?? "wood";
      const owned = normalizeOwnedPicks(u.miningPicksOwned);
      let cdEnd: number | null = null;
      if (u.lastMineAt) {
        cdEnd = u.lastMineAt.getTime() + MINE_COOLDOWN_MS;
      }
      const embed = await buildMineMenuEmbed({
        userId: uid,
        equipped,
        owned,
        cash: u.cash,
        cooldownEndsAt: cdEnd,
      });
      await message.reply({
        content: `<@${uid}>`,
        embeds: [embed],
        components: buildMineMenuRows({ userId: uid, equipped, owned }),
        allowedMentions: { users: [uid] },
      });
    } catch {
      await message.reply({
        embeds: [
          errorEmbed(
            "Mining menu could not load (database or migration). Ask an admin to run **Prisma migrations** and restart the bot.",
            { title: "Can't open mining" },
          ),
        ],
      });
    }
  },
};
