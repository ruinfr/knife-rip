import { EmbedBuilder, type Client, type GuildMember } from "discord.js";
import type { Prisma } from "@prisma/client";
import { getBotPrisma } from "./db-prisma";

const JAIL_COLOR = 0x546e7a;

export async function getJailConfig(guildId: string) {
  return getBotPrisma().botGuildJailConfig.findUnique({
    where: { guildId },
  });
}

/** Role IDs to remove when jailing (excludes @everyone, jail role, managed roles). */
export function collectRemovableRoleIds(
  member: GuildMember,
  jailRoleId: string,
): string[] {
  return [...member.roles.cache.values()]
    .filter(
      (r) =>
        r.id !== member.guild.id &&
        r.id !== jailRoleId &&
        !r.managed,
    )
    .sort((a, b) => b.position - a.position)
    .map((r) => r.id);
}

export function jailLogEmbed(params: {
  title: string;
  description: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(JAIL_COLOR)
    .setTitle(params.title)
    .setDescription(params.description)
    .setTimestamp(new Date());
}

export async function sendJailLog(
  client: Client,
  logChannelId: string,
  embed: EmbedBuilder,
): Promise<void> {
  const ch = await client.channels.fetch(logChannelId).catch(() => null);
  if (ch?.isTextBased() && !ch.isDMBased()) {
    await ch.send({ embeds: [embed] }).catch(() => {});
  }
}

export async function getJailMemberRow(guildId: string, userId: string) {
  return getBotPrisma().botGuildJailMember.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });
}

export function parseStoredRoleIds(raw: Prisma.JsonValue): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}
