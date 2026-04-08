import type { GuildMember } from "discord.js";
import { applyAutorolesOnJoin } from "./autorole-join";
import { getBotPrisma } from "./db-prisma";
import { applyReactionRoleGrantsOnJoin } from "./reaction-role-persist";

export async function applyGuildMemberJoinModeration(
  member: GuildMember,
): Promise<void> {
  const prisma = getBotPrisma();
  const guildId = member.guild.id;

  const hard = await prisma.botGuildHardban.findUnique({
    where: { guildId_userId: { guildId, userId: member.id } },
  });
  if (hard) {
    try {
      await member.ban({
        reason: hard.reason ?? "Hardban — rejoin blocked",
      });
    } catch {
      /* guild may lack permission */
    }
    return;
  }

  await applyAutorolesOnJoin(member);
  await applyReactionRoleGrantsOnJoin(member);

  const sticky = await prisma.botGuildStickyRole.findMany({
    where: { guildId, userId: member.id },
  });
  for (const s of sticky) {
    const role = member.guild.roles.cache.get(s.roleId);
    if (!role) continue;
    await member.roles.add(s.roleId, "Sticky role").catch(() => {});
  }

  const forced = await prisma.botGuildForcedNickname.findUnique({
    where: { guildId_userId: { guildId, userId: member.id } },
  });
  if (forced?.nickname) {
    await member
      .setNickname(forced.nickname.slice(0, 32), "Forced nickname")
      .catch(() => {});
  }
}
