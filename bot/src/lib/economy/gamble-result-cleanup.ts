import type { Message } from "discord.js";

const DELETE_MIN_MS = 5000;
const DELETE_MAX_MS = 7000;

/** Delete public gamble outcome messages after a short delay (5–7s). */
export function scheduleGambleOutcomeDeletion(
  message: Message | null | undefined,
): void {
  if (!message) return;
  const delay =
    DELETE_MIN_MS +
    Math.floor(Math.random() * (DELETE_MAX_MS - DELETE_MIN_MS + 1));
  setTimeout(() => {
    void message.delete().catch(() => {});
  }, delay);
}
