import type { Message } from "discord.js";
import { minimalEmbed } from "./embeds";

const MAX_NOTE_LEN = 200;

export type AfkState = { note: string; setAt: number };

const store = new Map<string, AfkState>();

function storeKey(guildId: string | null, userId: string): string {
  return `${guildId ?? "dm"}:${userId}`;
}

export function setAfkState(
  guildId: string | null,
  userId: string,
  note: string,
): void {
  const trimmed = note.trim().slice(0, MAX_NOTE_LEN);
  store.set(storeKey(guildId, userId), { note: trimmed, setAt: Date.now() });
}

export function clearAfkState(guildId: string | null, userId: string): boolean {
  return store.delete(storeKey(guildId, userId));
}

export function getAfkState(
  guildId: string | null,
  userId: string,
): AfkState | undefined {
  return store.get(storeKey(guildId, userId));
}

/** Removes AFK when the user sends any message. */
export function clearAfkOnAuthorMessage(message: Message): void {
  clearAfkState(message.guild?.id ?? null, message.author.id);
}

export async function notifyAfkMentions(message: Message): Promise<void> {
  if (!message.channel.isTextBased()) return;

  const guildId = message.guild?.id ?? null;
  const candidates = [...message.mentions.users.values()];
  const replied = message.mentions.repliedUser;
  if (
    replied &&
    !candidates.some((u) => u.id === replied.id)
  ) {
    candidates.push(replied);
  }

  const lines: string[] = [];

  for (const user of candidates) {
    if (user.bot) continue;
    if (user.id === message.author.id) continue;
    const st = getAfkState(guildId, user.id);
    if (!st) continue;
    lines.push(
      st.note
        ? `**${user.username}** is AFK — ${st.note}`
        : `**${user.username}** is AFK.`,
    );
  }

  if (lines.length === 0) return;

  await message
    .reply({
      embeds: [
        minimalEmbed({
          title: "AFK",
          description: lines.join("\n").slice(0, 4096),
        }),
      ],
      allowedMentions: { repliedUser: false },
    })
    .catch(() => {});
}
