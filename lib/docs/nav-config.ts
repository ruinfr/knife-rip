import type { DocNavGroup, DocNavLink } from "./types";

export const DOCS_QUICK_LINKS: DocNavLink[] = [
  { title: "Home", href: "/", icon: "mdi:home-outline", keywords: ["knife", "landing"] },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "mdi:view-dashboard-outline",
    keywords: ["guild", "server", "manage"],
  },
  {
    title: "Commands",
    href: "/commands",
    icon: "mdi:console-line",
    keywords: ["prefix", "list", "catalog"],
  },
  {
    title: "Discord hub",
    href: "/docs/resources#community",
    icon: "mdi:discord",
    keywords: ["support", "community", "invite"],
  },
];

export const DOCS_NAV_GROUPS: DocNavGroup[] = [
  {
    id: "fundamentals",
    title: "Overview",
    icon: "mdi:compass-outline",
    items: [
      {
        title: "Introduction",
        href: "/docs",
        icon: "mdi:book-open-page-variant-outline",
        keywords: ["start", "welcome", "knife"],
      },
      {
        title: "Getting started",
        href: "/docs/getting-started",
        icon: "mdi:rocket-launch-outline",
        keywords: ["invite", "setup", "permissions", "intents"],
      },
      {
        title: "Customization",
        href: "/docs/customization",
        icon: "mdi:tune-variant",
        keywords: ["prefix", "per-server", "commands"],
      },
      {
        title: "Security",
        href: "/docs/security",
        icon: "mdi:shield-lock-outline",
        keywords: ["token", "secret", "access", "staff"],
      },
    ],
  },
  {
    id: "protection",
    title: "Protection",
    icon: "mdi:shield-half-full",
    items: [
      {
        title: "Antinuke",
        href: "/docs/antinuke",
        icon: "mdi:shield-bug-outline",
        keywords: ["raid", "abuse", "limits"],
      },
      {
        title: "Antiraid",
        href: "/docs/antiraid",
        icon: "mdi:account-group-outline",
        keywords: ["join", "lockdown", "slowmode"],
      },
      {
        title: "Automod",
        href: "/docs/automod",
        icon: "mdi:robot-outline",
        keywords: ["auto", "filters", "rules"],
      },
      {
        title: "Moderation",
        href: "/docs/moderation",
        icon: "mdi:gavel",
        keywords: ["ban", "kick", "timeout", "jail", "purge"],
      },
      {
        title: "Fake permissions",
        href: "/docs/fake-permissions",
        icon: "mdi:account-lock-outline",
        keywords: ["hierarchy", "discord", "hoist"],
      },
      {
        title: "Server configuration",
        href: "/docs/server-configuration",
        icon: "mdi:cog-outline",
        keywords: ["guild", "settings", "access", "audit"],
      },
    ],
  },
  {
    id: "features",
    title: "Features",
    icon: "mdi:puzzle-outline",
    items: [
      {
        title: "Automation",
        href: "/docs/automation",
        icon: "mdi:calendar-clock-outline",
        keywords: ["remind", "birthday", "autorole", "schedule"],
      },
      {
        title: "Roles",
        href: "/docs/roles",
        icon: "mdi:shield-account-outline",
        keywords: ["reaction", "button", "sticky", "temprole"],
      },
      {
        title: "Messages",
        href: "/docs/messages",
        icon: "mdi:message-text-outline",
        keywords: ["say", "embed", "poll", "snipe", "purge"],
      },
      {
        title: "Starboard",
        href: "/docs/starboard",
        icon: "mdi:star-four-points-outline",
        keywords: ["stars", "highlights"],
      },
      {
        title: "VoiceMaster",
        href: "/docs/voicemaster",
        icon: "mdi:headphones",
        keywords: ["voice", "temporary", "channels"],
      },
      {
        title: "Levels",
        href: "/docs/levels",
        icon: "mdi:trophy-outline",
        keywords: ["leaderboard", "lb", "vlb", "messages", "voice"],
      },
      {
        title: "Bump reminder",
        href: "/docs/bump-reminder",
        icon: "mdi:arrow-up-circle-outline",
        keywords: ["disboard", "growth"],
      },
      {
        title: "Reaction triggers",
        href: "/docs/reaction-triggers",
        icon: "mdi:gesture-tap-button",
        keywords: ["reactionrole", "emoji"],
      },
      {
        title: "Command aliases",
        href: "/docs/command-aliases",
        icon: "mdi:alias",
        keywords: ["shortcuts", "triggers"],
      },
      {
        title: "Logging",
        href: "/docs/logging",
        icon: "mdi:text-box-search-outline",
        keywords: ["audit", "caselog", "history"],
      },
      {
        title: "Miscellaneous",
        href: "/docs/miscellaneous",
        icon: "mdi:dots-horizontal-circle-outline",
        keywords: ["afk", "highlight", "fun"],
      },
      {
        title: "Music",
        href: "/docs/music",
        icon: "mdi:music-note-outline",
        keywords: ["audio", "voice"],
      },
      {
        title: "Giveaways",
        href: "/docs/giveaways",
        icon: "mdi:gift-outline",
        keywords: ["prizes", "drops"],
      },
      {
        title: "Counting",
        href: "/docs/counting",
        icon: "mdi:numeric",
        keywords: ["channel", "game"],
      },
      {
        title: "Last.fm",
        href: "/docs/lastfm",
        icon: "mdi:music-circle-outline",
        keywords: ["scrobbles", "music", "osu"],
      },
      {
        title: "Utility",
        href: "/docs/utility",
        icon: "mdi:tools",
        keywords: ["crypto", "weather", "info", "tools"],
      },
    ],
  },
  {
    id: "reference",
    title: "Reference",
    icon: "mdi:book-outline",
    items: [
      {
        title: "Resources",
        href: "/docs/resources",
        icon: "mdi:link-variant",
        keywords: ["links", "pricing", "status", "embed"],
      },
      {
        title: "Scripting",
        href: "/docs/scripting",
        icon: "mdi:code-braces",
        keywords: ["embed", "variables", "say", "createembed"],
      },
      {
        title: "Permissions",
        href: "/docs/permissions",
        icon: "mdi:key-outline",
        keywords: ["discord", "administrator", "manage"],
      },
      {
        title: "Billing & premium",
        href: "/docs/billing",
        icon: "mdi:credit-card-outline",
        keywords: ["Arivix Pro", "stripe", "lifetime"],
      },
    ],
  },
];

export function flattenDocsNavForSearch(): Array<{
  title: string;
  href: string;
  group: string;
  searchText: string;
}> {
  const rows: Array<{
    title: string;
    href: string;
    group: string;
    searchText: string;
  }> = [];

  for (const link of DOCS_QUICK_LINKS) {
    rows.push({
      title: link.title,
      href: link.href,
      group: "Quick",
      searchText: [
        link.title,
        link.href,
        ...(link.keywords ?? []),
      ].join(" "),
    });
  }

  for (const g of DOCS_NAV_GROUPS) {
    for (const item of g.items) {
      rows.push({
        title: item.title,
        href: item.href,
        group: g.title,
        searchText: [
          item.title,
          g.title,
          item.href,
          ...(item.keywords ?? []),
        ].join(" "),
      });
    }
  }

  return rows;
}

export const DOCS_SLUGS = [
  "getting-started",
  "customization",
  "security",
  "antinuke",
  "antiraid",
  "automod",
  "moderation",
  "fake-permissions",
  "server-configuration",
  "automation",
  "roles",
  "messages",
  "starboard",
  "voicemaster",
  "levels",
  "bump-reminder",
  "reaction-triggers",
  "command-aliases",
  "logging",
  "miscellaneous",
  "music",
  "giveaways",
  "counting",
  "lastfm",
  "utility",
  "resources",
  "scripting",
  "permissions",
  "billing",
] as const;

export type DocsSlug = (typeof DOCS_SLUGS)[number];
