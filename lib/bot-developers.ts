import { BOT_OWNER_DISCORD_IDS } from "./bot-owners";

/**
 * **Developer** — top tier: can **.handout** **add/remove owner** for anyone, and change any
 * handout including other owners. Regular **owners** cannot change handouts for each other.
 *
 * Set snowflakes here and/or `DEVELOPER_DISCORD_IDS` in `.env` (comma‑separated).
 * If both are empty, the **first** ID in `BOT_OWNER_DISCORD_IDS` is treated as Developer
 * so the bot stays usable until you configure this explicitly.
 */
export const DEVELOPER_DISCORD_IDS: readonly string[] = [
  "1462526622648373312",
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
