import { getBotPrisma } from "../../lib/db-prisma";
import { WORK_COOLDOWN_MS } from "../../lib/economy/economy-tuning";
import {
  buildWorkMenuEmbed,
  buildWorkMenuRows,
  normalizeOwnedJobs,
  parseWorkJobKey,
} from "../../lib/economy/work-flow";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { errorEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

export const workCommand: ArivixCommand = {
  name: "work",
  aliases: ["job", "shift", "grind"],
  description:
    "Arivix Cash — jobs menu: roles, promotions, and job-specific shift minigames (treasury skim on pay)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".work · .job · .shift · .grind",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.work`** in a **server text channel** (not DMs)."),
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
        parseWorkJobKey(u.workJobEquipped ?? "intern") ?? "intern";
      const owned = normalizeOwnedJobs(u.workJobsOwned);
      let cdEnd: number | null = null;
      if (u.lastWorkAt) {
        cdEnd = u.lastWorkAt.getTime() + WORK_COOLDOWN_MS;
      }
      const embed = await buildWorkMenuEmbed({
        userId: uid,
        equipped,
        owned,
        cash: u.cash,
        cooldownEndsAt: cdEnd,
      });
      await message.reply({
        content: `<@${uid}>`,
        embeds: [embed],
        components: buildWorkMenuRows({ userId: uid, equipped, owned }),
        allowedMentions: { users: [uid] },
      });
    } catch {
      await message.reply({
        embeds: [
          errorEmbed(
            "Jobs menu could not load (database or migration). Ask an admin to run **Prisma migrations** and restart the bot.",
            { title: "Can't open jobs" },
          ),
        ],
      });
    }
  },
};
