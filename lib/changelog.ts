import { COMMAND_CATALOG_VERSION } from "@/lib/commands";
import { siteMetadataBase } from "@/lib/site-url";

/**
 * What's new — newest first. Public-facing copy only (no env names or markdown bold).
 *
 * `date` is the release calendar day (YYYY-MM-DD, America/New_York). Display via
 * {@link formatChangelogDateEst}.
 */
export type ChangelogEntry = {
  id: string;
  catalogVersion?: number;
  date: string;
  title: string;
  summary: string;
  bullets?: string[];
};

/** Format a changelog YYYY-MM-DD for readers in US Eastern (EST/EDT). */
export function formatChangelogDateEst(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return isoDate;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return isoDate;
  const instant = Date.UTC(y, mo - 1, d, 12, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(instant));
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: "2026-04-05-v29-baltop",
    catalogVersion: 29,
    date: "2026-04-05",
    title: ".baltop leaderboard",
    summary:
      "New prefix command for the global top Knife Cash balances (aliases .cashtop and .richest).",
    bullets: ["Same economy database as .cash and the gambling hub stats menu."],
  },
  {
    id: "2026-04-05-v28-messagedrop",
    catalogVersion: 28,
    date: "2026-04-05",
    title: "Message threshold cash drop",
    summary:
      "Bot owners can run .messagedrop to pay Knife Cash to every user who has at least a chosen lifetime message count.",
    bullets: [
      "Aliases: .msgdrop and .drop. Capped at 10,000 recipients per run; economy log records the payout.",
    ],
  },
  {
    id: "2026-04-08-v27-daily-public-gamble",
    catalogVersion: 27,
    date: "2026-04-08",
    title: "Daily reward and public gamble results",
    summary:
      ".daily grants 50 Knife Cash every 24 hours. Coinflip, dice, slots, blackjack, and mines replies from the hub are visible in the channel so others can see wins and losses.",
    bullets: [
      "Disclaimer mentions .daily and that game messages post in the channel.",
      "Database: lastDailyAt on economy users; run prisma migrate for new columns.",
    ],
  },
  {
    id: "2026-04-08-v26-webhook",
    catalogVersion: 26,
    date: "2026-04-08",
    title: "Webhook commands",
    summary:
      "Prefix webhook tools: create, list, send, edit, delete, lock, and unlock. List needs no member permission; other subcommands need Manage Webhooks.",
    bullets: [
      "Send and edit support plain text or JSON embed payloads; edit targets a Discord message link for webhook-owned messages.",
      "Optional lock stores in the database so only the locker (plus Administrators) can use Knife to act on that webhook.",
    ],
  },
  {
    id: "2026-04-07-v25-economy-config",
    catalogVersion: 25,
    date: "2026-04-07",
    title: "Economy and commands page",
    summary:
      "Optional per-server message stats and shop items via environment variables; owner-only commands show a Developer label on the command list.",
    bullets: [
      "Gambling shop can list different roles per server; buying grants the role in that server.",
      "Message counts for milestones and leaderboards only run in servers you configure.",
    ],
  },
  {
    id: "2026-04-05-v24-gambling",
    catalogVersion: 24,
    date: "2026-04-05",
    title: "Knife Cash hub",
    summary:
      "Gambling menu with shop, games, stats, and transfers. Cash command for balances; owner tools for grants and lucky drops.",
    bullets: [
      "Global wallet and message milestones; bonus payouts for boost or Pro where applicable.",
      "New Gambling section on the Commands page.",
    ],
  },
  {
    id: "2026-04-02-v23-leaderboards",
    catalogVersion: 23,
    date: "2026-04-02",
    title: "Text and voice leaderboards",
    summary:
      "Leaderboards for messages sent and time in voice (AFK channels excluded). Stats build while the bot is in the server.",
  },
  {
    id: "2026-03-25-v22-commands",
    catalogVersion: 22,
    date: "2026-03-25",
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
