import type { GuildMember } from "discord.js";
import { getBotPrisma } from "./db-prisma";
import { botCanAssignRole } from "./role-assignment-safety";

export async function applyReactionRoleGrantsOnJoin(
  member: GuildMember,
): Promise<void> {
  try {
    const prisma = getBotPrisma();
    const settings = await prisma.botGuildReactionRoleSettings.findUnique({
      where: { guildId: member.guild.id },
    });
    if (!settings?.restoreOnRejoin) return;

    const grants = await prisma.botGuildReactionRoleGrant.findMany({
      where: { guildId: member.guild.id, userId: member.id },
    });
    for (const g of grants) {
      const role = member.guild.roles.cache.get(g.roleId);
      if (!role || !botCanAssignRole(role)) continue;
      await member.roles.add(g.roleId, "Reaction role restore").catch(() => {});
    }
  } catch {
    /* optional */
  }
}

export async function purgeReactionGrantsOnLeaveIfNeeded(
  guildId: string,
  userId: string,
): Promise<void> {
  try {
    const prisma = getBotPrisma();
    const settings = await prisma.botGuildReactionRoleSettings.findUnique({
      where: { guildId },
    });
    if (settings?.restoreOnRejoin) return;
    await prisma.botGuildReactionRoleGrant.deleteMany({
      where: { guildId, userId },
    });
  } catch {
    /* optional */
  }
}

export async function upsertReactionGrant(
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  const prisma = getBotPrisma();
  await prisma.botGuildReactionRoleGrant.upsert({
    where: {
      guildId_userId_roleId: { guildId, userId, roleId },
    },
    create: { guildId, userId, roleId },
    update: {},
  });
}

export async function deleteReactionGrant(
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  try {
    const prisma = getBotPrisma();
    await prisma.botGuildReactionRoleGrant.delete({
      where: {
        guildId_userId_roleId: { guildId, userId, roleId },
      },
    });
  } catch {
    /* not found */
  }
}
