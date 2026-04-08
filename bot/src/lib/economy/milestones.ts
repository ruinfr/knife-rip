import type { Message } from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { economyPayoutMultiplier } from "./boost";
import { isEconomyTrackedGuild } from "./economy-guild-config";
import {
  MILESTONE_REWARDS,
  MILESTONE_THRESHOLDS,
} from "./config";

/**
 * Increment global message count and grant milestone cash (best-effort).
 */
export function recordEconomyMessageActivity(message: Message): void {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!isEconomyTrackedGuild(message.guild.id)) return;
  if (!message.channel.isTextBased() || message.channel.isDMBased()) return;

  void (async () => {
    try {
      const prisma = getBotPrisma();
      const uid = message.author.id;
      const guild = message.guild!;
      const member = await guild.members.fetch(uid).catch(() => null);
      const mult = await economyPayoutMultiplier(
        member,
        uid,
        message.client,
      );

      await prisma.$transaction(async (tx) => {
        const row = await tx.economyUser.upsert({
          where: { discordUserId: uid },
          create: { discordUserId: uid, lifetimeMessages: 1 },
          update: { lifetimeMessages: { increment: 1 } },
        });

        const msgs = row.lifetimeMessages;
        const startIdx = row.nextMilestoneIndex;
        let payIdx = startIdx;
        let totalReward = 0;

        while (
          payIdx < MILESTONE_THRESHOLDS.length &&
          msgs >= MILESTONE_THRESHOLDS[payIdx]!
        ) {
          totalReward += MILESTONE_REWARDS[payIdx]!;
          payIdx += 1;
        }

        if (payIdx > startIdx && totalReward > 0) {
          const bonus = Math.floor(totalReward * mult);
          const delta = BigInt(bonus);
          const newCash = row.cash + delta;
          await tx.economyUser.update({
            where: { discordUserId: uid },
            data: {
              cash: newCash,
              nextMilestoneIndex: payIdx,
            },
          });
          await tx.economyLedger.create({
            data: {
              discordUserId: uid,
              delta,
              balanceAfter: newCash,
              reason: "milestone",
              meta: {
                fromIndex: startIdx,
                throughIndex: payIdx,
                msgs,
              },
            },
          });
        } else if (payIdx > startIdx) {
          await tx.economyUser.update({
            where: { discordUserId: uid },
            data: { nextMilestoneIndex: payIdx },
          });
        }
      });
    } catch {
      /* ignore */
    }
  })();
}
