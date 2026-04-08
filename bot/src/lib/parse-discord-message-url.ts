/** Returns { guildId, channelId, messageId } from a discord message link. */
export function parseDiscordMessageUrl(
  text: string,
): { guildId: string; channelId: string; messageId: string } | null {
  const m = /discord(?:app)?\.com\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})/i.exec(
    text.trim(),
  );
  if (!m) return null;
  return { guildId: m[1], channelId: m[2], messageId: m[3] };
}
