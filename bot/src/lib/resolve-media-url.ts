import type { GuildMember, Message, User } from "discord.js";

/**
 * First image URL from attachments, explicit https URL in args, optional mention avatar.
 */
export function resolveMediaUrlFromCommand(
  message: Message,
  args: string[],
): { url: string; label?: string } | null {
  const att = message.attachments.find(
    (a) =>
      a.contentType?.startsWith("image/") ||
      /\.(png|jpe?g|gif|webp)$/i.test(a.name ?? ""),
  );
  if (att?.url) return { url: att.url, label: att.name ?? "attachment" };

  for (const raw of args) {
    const u = raw.trim();
    if (/^https?:\/\//i.test(u) && !u.includes("javascript:")) {
      return { url: u };
    }
  }

  return null;
}

export function resolveAvatarUrlForHex(
  message: Message,
  member: GuildMember | null,
  user: User | null,
): string | null {
  if (member) {
    return member.displayAvatarURL({ size: 256, extension: "png", forceStatic: true });
  }
  if (user) {
    return user.displayAvatarURL({ size: 256, extension: "png", forceStatic: true });
  }
  return null;
}
