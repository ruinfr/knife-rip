import type { Emoji, GuildEmoji } from "discord.js";

/** Stable DB key for reaction-role matching: custom `c:<id>` or unicode `u:<name>`. */
export function emojiKeyFromEmoji(emoji: Emoji | GuildEmoji): string {
  if (emoji.id) {
    return `c:${emoji.id}`;
  }
  const name = emoji.name;
  if (name) return `u:${name}`;
  return `u:unknown`;
}

/** Parse user input: `<:a:123>`, `<a:a:123>`, or single unicode emoji. */
export function parseEmojiKeyFromArg(raw: string): string | null {
  const t = raw.trim();
  const m = /^<a?:(\w+):(\d{17,20})>$/.exec(t);
  if (m) return `c:${m[2]}`;
  if (/^\d{17,20}$/.test(t)) return `c:${t}`;
  if (t.length >= 1 && !t.includes(" ")) {
    return `u:${t}`;
  }
  return null;
}
