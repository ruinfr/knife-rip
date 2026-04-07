import type { Message } from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { isEconomyTrackedGuild } from "../economy/economy-guild-config";

/**
 * Count one human message toward guild text leaderboard. Best-effort; no throw.
 */
export function recordGuildTextMessageForLeaderboard(message: Message): void {
  const guild = message.guild;
  if (!guild) return;
  if (!isEconomyTrackedGuild(guild.id)) return;
  if (message.author.bot) return;
  if (!message.channel.isTextBased()) return;
  if (message.channel.isDMBased()) return;

  void (async () => {
    try {
      const prisma = getBotPrisma();
      await prisma.botGuildMemberTextStats.upsert({
        where: {
          guildId_userId: { guildId: guild.id, userId: message.author.id },
        },
        create: {
          guildId: guild.id,
          userId: message.author.id,
          messageCount: 1,
        },
        update: { messageCount: { increment: 1 } },
      });
    } catch {
      /* ignore */
    }
  })();
}
