import { BOT_OWNER_DISCORD_IDS } from "./bot-owners";

/**
 * **Developers** — main controllers: **.handout** owner for anyone, full bypass (same as owners:
 * no command cooldown, **Administrator** + **Arivix Pro** checks skipped on `.say`, etc.).
 *
 * Add more snowflakes to the array when you promote additional developers.
 * Also merged: **`DEVELOPER_DISCORD_IDS`** in `.env` (comma‑separated).
 *
 * If the array **and** env are empty, the **first** ID in `BOT_OWNER_DISCORD_IDS` is treated as
 * Developer so owner handouts still work until you configure this list.
 */
export const DEVELOPER_DISCORD_IDS: readonly string[] = [
  "1490466051987865800",
  // Add more developer snowflakes below when needed, e.g.:
  // "1234567890123456789",
];

function envDeveloperIds(): string[] {
  const raw = process.env.DEVELOPER_DISCORD_IDS?.trim();
  if (!raw) return [];
  return raw.split(/[,\s]+/).filter(Boolean);
}

function buildDeveloperSet(): Set<string> {
  const s = new Set<string>([...DEVELOPER_DISCORD_IDS, ...envDeveloperIds()]);
  if (s.size === 0 && BOT_OWNER_DISCORD_IDS.length > 0) {
    s.add(BOT_OWNER_DISCORD_IDS[0]!);
  }
  return s;
}

const DEVELOPER_SET = buildDeveloperSet();

export function isDeveloperDiscordId(userId: string): boolean {
  return DEVELOPER_SET.has(userId);
}
