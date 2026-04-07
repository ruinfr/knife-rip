import { COMMAND_CATALOG_VERSION } from "@/lib/commands";
import { siteMetadataBase } from "@/lib/site-url";

/**
 * What's new — newest first. When you ship bot/site changes, add a row and
 * bump `COMMAND_CATALOG_VERSION` (site + bot) to match the top entry's
 * `catalogVersion` when the change affects the command list or bot behavior.
 */
export type ChangelogEntry = {
  /** Anchor id for /changelog#id */
  id: string;
  /** Command catalog sync version when relevant (optional for site-only tweaks). */
  catalogVersion?: number;
  date: string;
  title: string;
  /** Single line for .news footer / API `summary`. */
  summary: string;
  bullets?: string[];
};

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: "2026-04-10-v24-gambling",
    catalogVersion: 24,
    date: "2026-04-10",
    title: "Knife Cash gambling hub",
    summary:
      "**.gamble** hub (shop, coinflip/dice/slots, stats, pay), **.cash**, owner **.gcash** / **.luckydrop**; removed standalone **.coinflip**.",
    bullets: [
      "Global wallet + milestones from messages; +20% with boost or Pro.",
      "Site: new **Gambling & economy** section on /commands.",
      "Set **ECONOMY_LOG_CHANNEL_ID** for shop hub + mod logs.",
    ],
  },
  {
    id: "2026-04-09-v23-leaderboards",
    catalogVersion: 23,
    date: "2026-04-09",
    title: "Text and voice leaderboards",
    summary:
      "**.lb** shows top messengers; **.vlb** shows top voice time (AFK excluded). Stats accrue while Knife is in the server.",
    bullets: [
      "New tables: per-guild message counts and cumulative VC seconds.",
      "Aliases: .leaderboard, .textlb · .vcleaderboard, .voicelb",
    ],
  },
  {
    id: "2026-04-05-v22-aliases-perms",
    catalogVersion: 22,
    date: "2026-04-05",
    title: "Command aliases and fair guild permissions",
    summary:
      "Shorter triggers (.cmd, .dash, .mute, …); Manage Server/Nicknames required in-guild — no owner bypass for prefix, command rules, audit, or nickname.",
    bullets: [
      "Duplicate command triggers are detected at bot startup (warning in logs).",
      "Site handoffs unchanged: dashboard via OAuth; bot internals still need BOT_INTERNAL_SECRET.",
    ],
  },
  {
    id: "2026-04-05-v20-news",
    catalogVersion: 20,
    date: "2026-04-05",
    title: "Changelog on the site and .news",
    summary:
      "What's new lives at knife.rip/changelog — run .news in Discord for the latest line + link.",
    bullets: [
      "Public /changelog with dated entries.",
      "Bot: **.news** pulls the latest entry from the site API.",
      "**GET /api/public/changelog-latest** for RSS-style integrations.",
    ],
  },
  {
    id: "2026-04-05-v19-telemetry-errors",
    catalogVersion: 19,
    date: "2026-04-05",
    title: "Clearer permission errors and run telemetry",
    summary:
      "Permission issues point to the docs; audit rows track ok/fail; dashboard shows error rate.",
    bullets: [
      "Actionable embeds + link to /docs/permissions.",
      "Audit **success** flag; public insights use successful runs only.",
    ],
  },
  {
    id: "2026-04-05-v18-audit-insights",
    catalogVersion: 18,
    date: "2026-04-05",
    title: ".audit and anonymous usage insights",
    summary:
      "Manage Server audit log in Discord; Status shows global top commands (no server names).",
    bullets: ["**.audit**", "**/status** community insights", "Per-guild dashboard usage"],
  },
  {
    id: "2026-04-05-v17-command",
    catalogVersion: 17,
    date: "2026-04-05",
    title: "Per-channel command rules",
    summary:
      "**.command** — disable or enable commands by channel or server-wide; role bypass/deny overrides.",
  },
  {
    id: "2026-04-05-v16-prefix",
    catalogVersion: 16,
    date: "2026-04-05",
    title: "Custom prefix per server",
    summary:
      "**.prefix** with an allow-list of alternate prefixes (Manage Server).",
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

/** Dev hint: keep latest entry catalogVersion aligned with COMMAND_CATALOG_VERSION. */
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
