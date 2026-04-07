import { COMMAND_CATALOG_VERSION } from "@/lib/commands";
import { siteMetadataBase } from "@/lib/site-url";

/**
 * What's new — newest first. Public-facing copy only (no env names or markdown bold).
 */
export type ChangelogEntry = {
  id: string;
  catalogVersion?: number;
  date: string;
  title: string;
  summary: string;
  bullets?: string[];
};

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: "2026-04-11-v25-economy-config",
    catalogVersion: 25,
    date: "2026-04-11",
    title: "Economy and commands page",
    summary:
      "Optional per-server message stats and shop items via environment variables; owner-only commands show a Developer label on the command list.",
    bullets: [
      "Gambling shop can list different roles per server; buying grants the role in that server.",
      "Message counts for milestones and leaderboards only run in servers you configure.",
    ],
  },
  {
    id: "2026-04-10-v24-gambling",
    catalogVersion: 24,
    date: "2026-04-10",
    title: "Knife Cash hub",
    summary:
      "Gambling menu with shop, games, stats, and transfers. Cash command for balances; owner tools for grants and lucky drops.",
    bullets: [
      "Global wallet and message milestones; bonus payouts for boost or Pro where applicable.",
      "New Gambling section on the Commands page.",
    ],
  },
  {
    id: "2026-04-09-v23-leaderboards",
    catalogVersion: 23,
    date: "2026-04-09",
    title: "Text and voice leaderboards",
    summary:
      "Leaderboards for messages sent and time in voice (AFK channels excluded). Stats build while the bot is in the server.",
  },
  {
    id: "2026-04-05-v22-commands",
    catalogVersion: 22,
    date: "2026-04-05",
    title: "Commands and permissions",
    summary:
      "More command aliases; staff actions require the right Discord permissions in the server.",
  },
];

export function getLatestChangelogEntry(): ChangelogEntry {
  const first = CHANGELOG_ENTRIES[0];
  if (!first) {
    throw new Error("CHANGELOG_ENTRIES is empty");
  }
  return first;
}

export function changelogEntryAbsoluteUrl(entry: ChangelogEntry): string {
  const origin = siteMetadataBase().origin;
  return `${origin}/changelog#${entry.id}`;
}

export function assertLatestChangelogMatchesCatalog(): void {
  if (process.env.NODE_ENV !== "development") return;
  const latest = getLatestChangelogEntry();
  if (
    latest.catalogVersion != null &&
    latest.catalogVersion !== COMMAND_CATALOG_VERSION
  ) {
    console.warn(
      `[changelog] Latest entry catalogVersion (${latest.catalogVersion}) !== COMMAND_CATALOG_VERSION (${COMMAND_CATALOG_VERSION}). Update lib/changelog.ts or lib/commands.ts.`,
    );
  }
}
