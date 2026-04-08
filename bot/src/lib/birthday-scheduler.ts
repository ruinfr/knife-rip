import type { Client } from "discord.js";
import { getBotPrisma } from "./db-prisma";

/** Hourly: assign celebrate role for members whose birthday is today (UTC date). */
export async function tickBirthdayCelebrateRoles(client: Client): Promise<void> {
  try {
    const prisma = getBotPrisma();
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();

    const settingsRows = await prisma.botGuildBirthdaySettings.findMany({
      where: {
        OR: [{ celebrateRoleId: { not: null } }, { roleId: { not: null } }],
      },
    });

    for (const s of settingsRows) {
      const roleIds = [s.celebrateRoleId, s.roleId].filter(
        (x): x is string => Boolean(x),
      );
      const uniqueRoles = [...new Set(roleIds)];
      if (uniqueRoles.length === 0) continue;

      const guild = client.guilds.cache.get(s.guildId);
      if (!guild) continue;

      const birthdays = await prisma.botGuildMemberBirthday.findMany({
        where: {
          guildId: s.guildId,
          month,
          day,
          unlocked: true,
        },
      });

      for (const b of birthdays) {
        const mem = await guild.members.fetch(b.userId).catch(() => null);
        if (!mem?.manageable) continue;
        for (const rid of uniqueRoles) {
          await mem.roles.add(rid).catch(() => {});
        }
      }
    }
  } catch {
    /* optional */
  }
}
