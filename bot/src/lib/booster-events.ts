import type { GuildMember, PartialGuildMember } from "discord.js";
import { getBotPrisma } from "./db-prisma";

export async function recordBoosterChange(
  before: GuildMember | PartialGuildMember,
  after: GuildMember | PartialGuildMember,
): Promise<void> {
  const beforeBoost = Boolean(before.premiumSince);
  const afterBoost = Boolean(after.premiumSince);
  if (beforeBoost === afterBoost) return;

  try {
    const prisma = getBotPrisma();
    await prisma.botGuildBoosterEvent.create({
      data: {
        guildId: after.guild.id,
        userId: after.id,
        kind: afterBoost ? "gained" : "lost",
      },
    });
  } catch {
    /* optional */
  }
}
