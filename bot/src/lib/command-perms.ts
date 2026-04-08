import { PermissionFlagsBits, type Message } from "discord.js";

export function guildMemberHas(message: Message, flag: bigint): boolean {
  if (!message.guild || !message.member) return false;
  if (!message.channel.isTextBased()) return false;
  try {
    return message.member.permissionsIn(message.channel.id).has(flag);
  } catch {
    return message.member.permissions.has(flag);
  }
}

export { PermissionFlagsBits as Perm };
