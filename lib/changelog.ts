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
    id: "2026-04-10-v46-pet-name",
    catalogVersion: 46,
    date: "2026-04-10",
    title: "Pets: custom names",
    summary:
      ".pet name / .pet rename sets a nickname for your equipped pet (or clear it). Names show on .pets and .pet info. Command catalog v46.",
    bullets: [],
  },
  {
    id: "2026-04-10-v45-pet-info-bonus",
    catalogVersion: 45,
    date: "2026-04-10",
    title: "Pets: .pet info and clearer gamble bonus",
    summary:
      "New .pet info explains XP and happiness bonuses on .gamble house games. Happiness 85+ adds a small extra on top of XP tiers; pet slice stays capped. .pets footer shows the equipped bonus; feeding reports the new approximate bonus. Command catalog v45.",
    bullets: [],
  },
  {
    id: "2026-04-10-v44-canonical-economy",
    catalogVersion: 44,
    date: "2026-04-10",
    title: "Commands page: full economy catalog",
    summary:
      "Canonical /commands entries now include work, crime, beg, bank, deposit, withdraw, business, mine, fish, pet, pets, rob, duel, and bounty, with an updated Gambling & economy category blurb. Command catalog v44.",
    bullets: [],
  },
  {
    id: "2026-04-10-v43-pet-species",
    catalogVersion: 43,
    date: "2026-04-10",
    title: "Pets: dog, cat, rabbit",
    summary:
      "Arivix Cash pet shop species are now dog, cat, and rabbit (command catalog v43). Older pet types in the database still work for feed and equip.",
    bullets: [],
  },
  {
    id: "2026-04-08-v42-economy-expansion",
    catalogVersion: 42,
    date: "2026-04-08",
    title: "Arivix Cash expansion: work, bank, pets, PvP",
    summary:
      "Major economy layer: work, crime, beg, mine and fish gathering, bank deposit or withdraw with lazy interest and tiers, passive businesses, pets with a button menu and small gamble multipliers, guild-only rob, stake duels with treasury rake, and bounties paid on successful robberies. Fees route to a configurable treasury user. Command catalog v42; migration 20260416150000_economy_expansion_v2.",
    bullets: [],
  },
  {
    id: "2026-04-09-v41-vanity-prefix-only",
    catalogVersion: 41,
    date: "2026-04-09",
    title: "Vanity: prefix only (.vanities)",
    summary:
      "The /vanities Discord slash command was removed; use .vanities / .vanity drop and .vanity search instead. Command catalog v41.",
    bullets: [],
  },
  {
    id: "2026-04-08-docs-overhaul",
    catalogVersion: 40,
    date: "2026-04-08",
    title: "Documentation hub refresh",
    summary:
      "The docs section is now a full guide hub with sidebar navigation, Command+K search, mobile drawer, sticky table of contents, and themed motion. Articles cover Arivix features honestly (including not-yet features) with deep links across commands, embed builder, and dashboard.",
    bullets: [],
  },
  {
    id: "2026-04-08-v40-vanity-slash",
    catalogVersion: 40,
    date: "2026-04-08",
    title: "Vanity scanner (prefix)",
    summary:
      "Arivix Pro vanity scanning uses prefix .vanity search, .vanity drop, and .vanities (recent drops with buttons). Background scans use VANITY_SCANNER_ENABLED=1.",
    bullets: [],
  },
  {
    id: "2026-04-08-v39-vanity-pro",
    catalogVersion: 39,
    date: "2026-04-08",
    title: "Arivix Pro: vanity slug search and recent drops",
    summary:
      "Prefix .vanity search looks up a discord.gg slug via Discord. .vanity drop or .vanities lists recent dictionary-driven invite releases with pagination like other vanity bots. A background scanner runs when VANITY_SCANNER_ENABLED=1; apply migration 20260408160000_vanity_invite_observation.",
    bullets: [],
  },
  {
    id: "2026-04-18-v38-command-aliases",
    catalogVersion: 38,
    date: "2026-04-18",
    title: "Command aliases and duplicate-trigger fix",
    summary:
      "Many commands gained short, memorable aliases (moderation, economy, webhooks, embeds, and more). The remind command no longer claims the same trigger as reminders. Developers can run npm run check:aliases to verify uniqueness.",
    bullets: [],
  },
  {
    id: "2026-04-18-v37-embed-builder",
    catalogVersion: 37,
    date: "2026-04-18",
    title: "Site: command category tabs + embed builder",
    summary:
      "The commands page has horizontal category filters with counts. New /tools/embed builder outputs Arivix {embed}$v scripts; .say and .createembed accept those scripts (plus variable substitution from the invoker context). .webhook send/edit also accepts the script after JSON parsing fails.",
    bullets: [
      "createembed is Arivix Pro plus Administrator, same gates as say, and expects an embed script.",
    ],
  },
  {
    id: "2026-04-18-v36-crypto-commands",
    catalogVersion: 36,
    date: "2026-04-18",
    title: "Crypto: price, gas, transactions, BTC notify",
    summary:
      "Prefix commands for spot prices (.crypto), Ethereum gas (.gas), BTC/LTC/ETH transaction lookup (.transaction), and Bitcoin confirmation alerts (.subscribe). Site command list updates when the bot syncs.",
    bullets: [
      ".subscribe needs DATABASE_URL and migration 20260416140000_bot_btc_tx_watch.",
      "Optional ETHERSCAN_API_KEY improves ETH tx details and gas oracle reliability.",
    ],
  },
  {
    id: "2026-04-16-v35-snipe-history",
    catalogVersion: 35,
    date: "2026-04-16",
    title: "Snipe: clear and reaction history",
    summary:
      "Staff with Manage Messages can clear per-channel snipe buffers (.clearsnipe) and inspect logged reaction adds/removes for a message via jump link (.reactionhistory), within the same in-memory TTL as .snipe.",
    bullets: [],
  },
  {
    id: "2026-04-05-v34-utility-social",
    catalogVersion: 34,
    date: "2026-04-05",
    title: "Utility and social commands",
    summary:
      "Large utility pack: stickers, emoji management, image tools (rotate, compress, invert, hex), lookups (define, Urban Dictionary, osu!, weather, Telegram, invite info, screenshot), server lists and info, highlight DMs, birthdays, timezones, boost history, and more. Requires DATABASE_URL for persistence features.",
    bullets: [
      "Optional env: OSU_LEGACY_API_KEY, OPENWEATHER_API_KEY, TELEGRAM_BOT_TOKEN.",
      "Apply migration 20260415130000_utility_social_features when you deploy the schema.",
    ],
  },
  {
    id: "2026-04-07-v33-moderation-suite",
    catalogVersion: 33,
    date: "2026-04-07",
    title: "Moderation mega-suite",
    summary:
      "Cases (.history), warnings, notes, proofs, bans (unban, softban, tempban, hardban, unbanall), lockdown, expanded purge/role tools, temprole, thread/utility commands, and scheduled jail/unban/temprole.",
    bullets: [
      "See /commands for the full list — most actions require Manage Messages, Ban Members, or Manage Roles as documented per command.",
    ],
  },
  {
    id: "2026-04-05-v32-guild-jail",
    catalogVersion: 32,
    date: "2026-04-05",
    title: "Guild jail system",
    summary:
      "Admins run .jailsetup once to create the Jailed role, #jail, and #jail-logs; staff use .jail, .unjail, and .jaillist with role strip and restore.",
    bullets: [
      "Aliases: .setupjail / .jset for setup; .jails and .whoisjailed for the list.",
    ],
  },
  {
    id: "2026-04-05-v31-roulette",
    catalogVersion: 31,
    date: "2026-04-05",
    title: "Arivix Cash roulette",
    summary:
      "American roulette in the gamble hub: set your bet, then choose Red, Black, or Green on the wheel.",
    bullets: [
      "Red or black pays even money; green wins on 0 or 00 with a higher return.",
    ],
  },
  {
    id: "2026-04-05-v30-coinflip-pvp",
    catalogVersion: 30,
    date: "2026-04-05",
    title: "Coinflip PVP in Arivix Cash",
    summary:
      "Challenge another member to a fair 50/50 coinflip with matching stakes: they accept or decline, then balances settle in one step with no house rake.",
    bullets: [
      "From the gamble hub Games page, use Coinflip PVP and pick opponent plus amount.",
    ],
  },
  {
    id: "2026-04-05-v29-baltop",
    catalogVersion: 29,
    date: "2026-04-05",
    title: ".baltop leaderboard",
    summary:
      "New prefix command for the global top Arivix Cash balances (aliases .cashtop and .richest).",
    bullets: ["Same economy database as .cash and the gambling hub stats menu."],
  },
  {
    id: "2026-04-05-v28-messagedrop",
    catalogVersion: 28,
    date: "2026-04-05",
    title: "Message threshold cash drop",
    summary:
      "Bot owners can run .messagedrop to pay Arivix Cash to every user who has at least a chosen lifetime message count.",
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
      ".daily grants 50 Arivix Cash every 24 hours. Coinflip, dice, slots, blackjack, and mines replies from the hub are visible in the channel so others can see wins and losses.",
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
      "Optional lock stores in the database so only the locker (plus Administrators) can use Arivix to act on that webhook.",
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
    title: "Arivix Cash hub",
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
