/**
 * Canonical public catalog — merged on top of the DB snapshot from the bot.
 * Keeps /commands accurate when sync is stale or missing rows. Update when
 * you add or change `site` metadata in `bot/src/commands/`.
 *
 * Include every `aliases` entry here so Shortcuts match Discord (canonical wins over DB for these names).
 */
export type CanonicalCommandSiteRow = {
  name: string;
  description: string;
  usage?: string;
  tier: "free" | "pro";
  style: "prefix" | "slash";
  aliases?: string[];
  categoryId: string;
  categoryTitle: string;
  categoryDescription: string;
};

const CANONICAL_UNSORTED: CanonicalCommandSiteRow[] = [
  {
    name: "afk",
    description:
      "Set AFK with an optional reason (default “AFK”); auto-reply + welcome back when you return",
    usage: ".afk [reason] · .afk clear",
    tier: "free",
    style: "prefix",
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "avatar",
    description: "Show a user’s avatar (mention, ID, or yourself)",
    usage: ".avatar [@user | user ID]",
    tier: "free",
    style: "prefix",
    aliases: ["av"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "banner",
    description:
      "Show a user or server banner image (mention, ID, or yourself; use “server” for guild)",
    usage: ".banner [@user | user ID] · .banner server",
    tier: "free",
    style: "prefix",
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "coinflip",
    description: "Flip a coin — Heads or Tails, or challenge someone",
    usage: ".coinflip · .coinflip @user · .cf · .flip",
    tier: "free",
    style: "prefix",
    aliases: ["flip", "cf"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "emoji",
    description:
      "Show a custom emoji at full size (paste <:name:id> or use numeric ID)",
    usage: ".emoji <:name:id> · .emoji 123456789012345678",
    tier: "free",
    style: "prefix",
    aliases: ["e"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "help",
    description: "Link to the full command list on the Knife site",
    usage: ".help",
    tier: "free",
    style: "prefix",
    aliases: ["h"],
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "knife",
    description: "About Knife — site links, prefix, and gateway latency",
    usage: ".knife",
    tier: "free",
    style: "prefix",
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "ping",
    description: "Check bot and Discord gateway latency",
    usage: ".ping",
    tier: "free",
    style: "prefix",
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
  },
  {
    name: "premium",
    description: "Knife Pro — one-time lifetime unlock and your status",
    usage: ".premium",
    tier: "free",
    style: "prefix",
    aliases: ["pro", "prem"],
    categoryId: "pro",
    categoryTitle: "Pro",
    categoryDescription: "Knife Pro billing and perks.",
  },
  {
    name: "roleinfo",
    description: "Show details for a role (mention, ID, or name)",
    usage: ".roleinfo @Role · .roleinfo 123… · .roleinfo Mod Team",
    tier: "free",
    style: "prefix",
    aliases: ["ri"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "roblox",
    description: "Roblox profile — lookup by username",
    usage: ".roblox username · .rblx",
    tier: "free",
    style: "prefix",
    aliases: ["rblx"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "say",
    description:
      "Post as the bot in a channel (Knife Pro + Administrator; bot owners skip both)",
    usage: ".say #channel your message",
    tier: "pro",
    style: "prefix",
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
  },
  {
    name: "serverinfo",
    description: "Detailed server stats (sectioned layout)",
    usage: ".serverinfo · .si",
    tier: "free",
    style: "prefix",
    aliases: ["si"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "tiktok",
    description: "TikTok profile — stats and bio for a @username",
    usage: ".tiktok username · .tt @username",
    tier: "free",
    style: "prefix",
    aliases: ["tt"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "tts",
    description: "Text-to-speech — replies with your line as an MP3",
    usage: ".tts your message · .texttospeech · .text2speech",
    tier: "free",
    style: "prefix",
    aliases: ["texttospeech", "text2speech"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "uptime",
    description: "How long the bot process has been running",
    usage: ".uptime",
    tier: "free",
    style: "prefix",
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "userinfo",
    description: "Detailed user profile (sectioned layout)",
    usage: ".userinfo [@user | ID] · .ui",
    tier: "free",
    style: "prefix",
    aliases: ["ui"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
  {
    name: "voicemaster",
    description:
      "VoiceMaster — temp voice channels from a hub; paginated panel (lock, ghost, disconnect picker, info, user limit, rename) plus permit, transfer, defaults",
    usage:
      ".voicemaster setup · panel ({{mdi:lock}} lock · {{mdi:ghost-outline}} ghost · {{mdi:lan-disconnect}} disconnect · {{mdi:plus}} limit · {{mdi:pencil}} rename) · .vm join",
    tier: "free",
    style: "prefix",
    aliases: ["vm"],
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
  },
];

export const CANONICAL_COMMAND_SITE_ROWS: CanonicalCommandSiteRow[] = [
  ...CANONICAL_UNSORTED,
].sort((a, b) => a.name.localeCompare(b.name));
