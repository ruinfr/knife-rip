import type { Message } from "discord.js";
import { getBotPrisma } from "../db-prisma";

/**
 * Count one human message toward this guild’s `.lb` stats. Best-effort; no throw.
 * Runs for every guild text message the bot receives.
 */
export function recordGuildTextMessageForLeaderboard(message: Message): void {
  const guild = message.guild;
  if (!guild) return;
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
