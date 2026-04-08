import type { Client } from "discord.js";
import { getBotPrisma } from "./db-prisma";

/** Call every ~60s from bot process */
export async function tickModerationSchedulers(client: Client): Promise<void> {
  const prisma = getBotPrisma();
  const now = new Date();

  const dueUnbans = await prisma.botGuildScheduledUnban.findMany({
    where: { expiresAt: { lte: now } },
    take: 50,
  });
  for (const row of dueUnbans) {
    try {
      const g = await client.guilds.fetch(row.guildId).catch(() => null);
      if (g) {
        await g.members.unban(row.userId, "Tempban expired").catch(() => {});
      }
    } catch {
      /* ignore */
    }
    await prisma.botGuildScheduledUnban
      .delete({ where: { id: row.id } })
      .catch(() => {});
  }

  const dueRoles = await prisma.botGuildTempRoleGrant.findMany({
    where: { expiresAt: { lte: now } },
    take: 50,
  });
  for (const row of dueRoles) {
    try {
      const g = await client.guilds.fetch(row.guildId).catch(() => null);
      if (!g) continue;
      const mem = await g.members.fetch(row.userId).catch(() => null);
      if (mem) {
        await mem.roles.remove(row.roleId, "Temprole expired").catch(() => {});
      }
    } catch {
      /* ignore */
    }
    await prisma.botGuildTempRoleGrant
      .delete({ where: { id: row.id } })
      .catch(() => {});
  }

  const jailedDue = await prisma.botGuildJailMember.findMany({
    where: {
      releaseAt: { not: null, lte: now },
    },
    take: 30,
  });
  for (const row of jailedDue) {
    try {
      const config = await prisma.botGuildJailConfig.findUnique({
        where: { guildId: row.guildId },
      });
      const g = await client.guilds.fetch(row.guildId).catch(() => null);
      if (!g || !config) continue;
      const mem = await g.members.fetch(row.userId).catch(() => null);
      if (mem) {
        await mem.roles.remove(config.jailRoleId, "Jail time served").catch(() => {});
        const ids = row.removedRoleIds;
        const arr = Array.isArray(ids)
          ? ids.filter((x): x is string => typeof x === "string")
          : [];
        const me = g.members.me;
        if (me) {
          for (const rid of arr) {
            const role = g.roles.cache.get(rid) ?? (await g.roles.fetch(rid).catch(() => null));
            if (!role || role.managed || role.position >= me.roles.highest.position) {
              continue;
            }
            await mem.roles.add(rid, "Auto-unjail restore").catch(() => {});
          }
        }
      }
      await prisma.botGuildJailMember.delete({
        where: { id: row.id },
      });
    } catch {
      /* ignore */
    }
  }
}
