import type { GuildMember } from "discord.js";
import { getBotPrisma } from "./db-prisma";
import { botCanAssignRole } from "./role-assignment-safety";

export async function applyAutorolesOnJoin(member: GuildMember): Promise<void> {
  try {
    const prisma = getBotPrisma();
    const rows = await prisma.botGuildAutorole.findMany({
      where: { guildId: member.guild.id },
    });
    for (const r of rows) {
      const role = member.guild.roles.cache.get(r.roleId);
      if (!role || !botCanAssignRole(role)) continue;
      await member.roles.add(r.roleId, "Autorole").catch(() => {});
    }
  } catch {
    /* optional */
  }
}
