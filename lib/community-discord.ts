/**
 * Official knife.rip Discord hub (Pro/owner/dev role sync, support).
 * Override with env if the invite is rotated — only https `discord.gg` / `discord.com/invite` URLs are accepted.
 */
export const DEFAULT_COMMUNITY_DISCORD_INVITE_URL =
  "https://discord.gg/tCkFcqcPwk";

const INVITE_PATTERN =
  /^https:\/\/(?:discord\.gg\/[A-Za-z0-9_-]{2,40}|discord\.com\/invite\/[A-Za-z0-9_-]{2,40})\/?$/i;

function normalizeInviteCandidate(raw: string): string | null {
  const t = raw.trim();
  if (t.length < 12 || t.length > 200) return null;
  const u = t.replace(/\/+$/, "");
  return INVITE_PATTERN.test(u) ? u : null;
}

/**
 * Resolved invite for hub links (site + bot). Invalid env values fall back to the default.
 */
export function resolveCommunityDiscordInviteUrl(): string {
  for (const key of [
    "NEXT_PUBLIC_DISCORD_COMMUNITY_INVITE_URL",
    "COMMUNITY_DISCORD_INVITE_URL",
  ] as const) {
    const v = normalizeInviteCandidate(process.env[key] ?? "");
    if (v) return v;
  }
  return DEFAULT_COMMUNITY_DISCORD_INVITE_URL;
}
