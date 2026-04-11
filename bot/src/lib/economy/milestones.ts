import type { Message } from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { rebirthBoostEarn } from "./rebirth-income";
import { resolvePayoutMultiplier } from "./payout-multiplier";
import {
  MILESTONE_HIGH_REWARDS,
  MILESTONE_HIGH_THRESHOLDS,
  MILESTONE_STACK_100_EXTRA_CASH,
  MILESTONE_STACK_50_CASH,
} from "./config";

/**
 * Increment global message count and grant milestone cash (best-effort).
 * Counts human messages in any guild text context the bot sees (not DMs).
 *
 * Repeating stack: each 50 msgs (50,100,150,…) → +STACK_50; each 100 boundary → +STACK_100 extra.
 * Plus one-time bonuses at 500 / 1k / 3k.
 */
export function recordEconomyMessageActivity(message: Message): void {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.channel.isTextBased() || message.channel.isDMBased()) return;

  void (async () => {
    try {
      const prisma = getBotPrisma();
      const uid = message.author.id;
      const guild = message.guild!;
      const member = await guild.members.fetch(uid).catch(() => null);
      const mult = await resolvePayoutMultiplier({
        userId: uid,
        member,
        client: message.client,
      });

      await prisma.$transaction(async (tx) => {
        const row = await tx.economyUser.upsert({
          where: { discordUserId: uid },
          create: { discordUserId: uid, lifetimeMessages: 1 },
          update: { lifetimeMessages: { increment: 1 } },
        });

        const msgs = row.lifetimeMessages;
        let last50 = row.milestoneLastPaid50;
        let highIdx = row.nextMilestoneIndex;
        let stackReward = 0;

        while (last50 + 50 <= msgs) {
          last50 += 50;
          stackReward += MILESTONE_STACK_50_CASH;
          if (last50 % 100 === 0) {
            stackReward += MILESTONE_STACK_100_EXTRA_CASH;
          }
        }

        let highReward = 0;
        while (
          highIdx < MILESTONE_HIGH_THRESHOLDS.length &&
          msgs >= MILESTONE_HIGH_THRESHOLDS[highIdx]!
        ) {
          highReward += MILESTONE_HIGH_REWARDS[highIdx]!;
          highIdx += 1;
        }

        const totalReward = stackReward + highReward;

        if (totalReward > 0) {
          const bonus = Math.floor(totalReward * mult);
          const delta = rebirthBoostEarn(
            row,
            member,
            BigInt(bonus),
          );
          const newCash = row.cash + delta;
          await tx.economyUser.update({
            where: { discordUserId: uid },
            data: {
              cash: newCash,
              milestoneLastPaid50: last50,
              nextMilestoneIndex: highIdx,
            },
          });
          await tx.economyLedger.create({
            data: {
              discordUserId: uid,
              delta,
              balanceAfter: newCash,
              reason: "milestone",
              meta: {
                msgs,
                milestoneLastPaid50: last50,
                nextHighTierIndex: highIdx,
                stackCash: stackReward,
                highCash: highReward,
              },
            },
          });
        }
      });
    } catch {
      /* ignore */
    }
  })();
}
