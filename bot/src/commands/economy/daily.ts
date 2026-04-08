import { ecoM } from "../../lib/economy/custom-emojis";
import {
  DAILY_COOLDOWN_MS,
  DAILY_REWARD_CASH,
} from "../../lib/economy/config";
import { formatCash } from "../../lib/economy/money";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const dailyCommand: KnifeCommand = {
  name: "daily",
  description:
    "Claim free Knife Cash once every 24 hours (50 cash per claim)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Knife Cash (global wallet), shop, house games, and transfers — virtual currency for fun.",
    usage: ".daily",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const uid = message.author.id;
    const prisma = getBotPrisma();
    const now = Date.now();
    const reward = DAILY_REWARD_CASH;

    const result = await prisma.$transaction(async (tx) => {
      const u = await tx.economyUser.upsert({
        where: { discordUserId: uid },
        create: { discordUserId: uid },
        update: {},
      });
      if (u.lastDailyAt) {
        const elapsed = now - u.lastDailyAt.getTime();
        if (elapsed < DAILY_COOLDOWN_MS) {
          return {
            ok: false as const,
            nextAt: u.lastDailyAt.getTime() + DAILY_COOLDOWN_MS,
          };
        }
      }
      const newCash = u.cash + reward;
      await tx.economyUser.update({
        where: { discordUserId: uid },
        data: {
          cash: newCash,
          lastDailyAt: new Date(now),
        },
      });
      await tx.economyLedger.create({
        data: {
          discordUserId: uid,
          delta: reward,
          balanceAfter: newCash,
          reason: "daily",
        },
      });
      return { ok: true as const, newCash };
    });

    if (!result.ok) {
      const rel = Math.floor(result.nextAt / 1000);
      await message.reply({
        embeds: [
          errorEmbed(
            `You already claimed your daily. Next: <t:${rel}:R> (<t:${rel}:f>).`,
          ),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `${ecoM.cash} Daily reward`,
          description:
            `You received **${formatCash(reward)}** cash. Balance: **${formatCash(result.newCash)}**.\n` +
            `Come back in **24 hours** for the next claim.`,
        }),
      ],
    });
  },
};
