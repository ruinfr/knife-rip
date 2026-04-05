import {
  ChannelType,
  type Guild,
  UserFlags,
  type User,
} from "discord.js";

/** Discord `<t:unix:style>` */
export function ts(sec: number, style: "D" | "F" | "f" | "R"): string {
  return `<t:${sec}:${style}>`;
}

export function verificationLabel(level: number): string {
  return ["None", "Low", "Medium", "High", "Very High"][level] ?? "Unknown";
}

export function boostTierLabel(tier: number): string {
  if (tier <= 0) return "None";
  return `Level ${tier}`;
}

/** Max static + animated emoji slots (approx. Discord boost table). */
export function maxEmojiSlots(premiumTier: number): number {
  const perType = [50, 100, 150, 250][premiumTier] ?? 50;
  return perType * 2;
}

export function userBadgeEmojis(user: User): string {
  const f = user.flags;
  if (!f) return "";
  const parts: string[] = [];
  if (f.has(UserFlags.Staff)) parts.push("Discord Staff");
  if (f.has(UserFlags.Partner)) parts.push("Partner");
  if (f.has(UserFlags.Hypesquad)) parts.push("Hypesquad");
  if (f.has(UserFlags.BugHunterLevel1)) parts.push("Bug Hunter");
  if (f.has(UserFlags.BugHunterLevel2)) parts.push("Bug Hunter Gold");
  if (f.has(UserFlags.HypeSquadOnlineHouse1)) parts.push("Bravery");
  if (f.has(UserFlags.HypeSquadOnlineHouse2)) parts.push("Brilliance");
  if (f.has(UserFlags.HypeSquadOnlineHouse3)) parts.push("Balance");
  if (f.has(UserFlags.PremiumEarlySupporter)) parts.push("Early Supporter");
  if (f.has(UserFlags.VerifiedDeveloper)) parts.push("Verified Dev");
  if (f.has(UserFlags.ActiveDeveloper)) parts.push("Active Dev");
  if (f.has(UserFlags.CertifiedModerator)) parts.push("Mod Alumni");
  if (f.has(UserFlags.VerifiedBot)) parts.push("Verified Bot");
  return parts.length ? parts.join(" · ") : "";
}

export type ChannelBreakdown = {
  text: number;
  voice: number;
  category: number;
  total: number;
};

export function channelBreakdown(guild: Guild): ChannelBreakdown {
  const c = guild.channels.cache;
  const text = c.filter(
    (ch) =>
      ch.type === ChannelType.GuildText ||
      ch.type === ChannelType.GuildAnnouncement ||
      ch.type === ChannelType.GuildForum,
  ).size;
  const voice = c.filter(
    (ch) =>
      ch.type === ChannelType.GuildVoice ||
      ch.type === ChannelType.GuildStageVoice,
  ).size;
  const category = c.filter((ch) => ch.type === ChannelType.GuildCategory).size;
  return { text, voice, category, total: text + voice + category };
}

export function designAssetLink(label: string, url: string | null): string {
  return url ? `[${label}](${url})` : `~~${label}~~`;
}
