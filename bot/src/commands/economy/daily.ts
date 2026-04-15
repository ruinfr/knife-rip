import { ecoM } from "../../lib/economy/custom-emojis";
import {
  DAILY_COOLDOWN_MS,
  DAILY_REWARD_CASH,
} from "../../lib/economy/config";
import { rebirthBoostEarn } from "../../lib/economy/rebirth-income";
import {
  dailyRewardMultBps,
} from "../../lib/economy/rebirth-mult";
import { formatCash } from "../../lib/economy/money";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const dailyCommand: KnifeCommand = {
  name: "daily",
  aliases: ["claim", "payday", "payout", "stipend"],
  description:
    "Claim free Arivix Cash once every 24 hours (50 cash per claim)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".daily · .claim · .payday · .payout",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const uid = message.author.id;
    const prisma = getBotPrisma();
    const now = Date.now();
    const member =
      message.member ??
      (message.guild
        ? await message.guild.members.fetch(uid).catch(() => null)
        : null);

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
      const baseReward =
        (DAILY_REWARD_CASH * BigInt(dailyRewardMultBps(u))) / 10000n;
      const reward = rebirthBoostEarn(u, member, baseReward);
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
      return { ok: true as const, newCash, reward };
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
            `You received **${formatCash(result.reward)}** cash. Balance: **${formatCash(result.newCash)}**.\n` +
            `Come back in **24 hours** for the next claim.`,
        }),
      ],
    });
  },
};
