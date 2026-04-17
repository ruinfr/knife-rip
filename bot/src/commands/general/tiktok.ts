import { getRapidApiKey } from "../../config";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import {
  fetchTikTokProfile,
  isPlausibleTikTokUsername,
  normalizeTikTokUsername,
} from "../../lib/tiktok-api";
import type { ArivixCommand } from "../types";

const BIO_MAX = 400;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export const tiktokCommand: ArivixCommand = {
  name: "tiktok",
  aliases: ["tt"],
  description: "TikTok profile — stats and bio for a @username",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".tiktok username · .tt @username",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const key = getRapidApiKey();
    if (!key) {
      await message.reply({
        embeds: [
          errorEmbed(
            "**.tiktok** needs **RAPIDAPI_KEY** in `.env` (RapidAPI → subscribe to [TikTok API — Tikfly](https://rapidapi.com/tikfly/api/tiktok-api23)).",
          ),
        ],
      });
      return;
    }

    const raw = normalizeTikTokUsername(args.join(" "));
    if (!raw) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **.tiktok** `username` (no @ required) · **.tt**"),
        ],
      });
      return;
    }

    if (!isPlausibleTikTokUsername(raw)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "That doesn’t look like a valid TikTok username (letters, numbers, `.` and `_` only).",
          ),
        ],
      });
      return;
    }

    const result = await fetchTikTokProfile(raw.toLowerCase(), key);
    if (!result.ok) {
      await message.reply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    const p = result.data;
    const url = `https://www.tiktok.com/@${encodeURIComponent(p.uniqueId)}`;
    const verified = p.verified ? " ✓" : "";
    const privacy = p.privateAccount ? "\n**Account:** Private" : "";
    let bio = p.signature || "*No bio*";
    if (bio.length > BIO_MAX) {
      bio = `${bio.slice(0, BIO_MAX - 1)}…`;
    }

    const lines = [
      `**[@${p.uniqueId}](${url})**${verified}`,
      "",
      `**Followers:** ${fmt(p.followerCount)} · **Following:** ${fmt(p.followingCount)} · **Videos:** ${fmt(p.videoCount)}`,
      `**Total likes:** ${fmt(p.heartCount)}`,
      "",
      `**Bio:** ${bio}`,
      privacy,
    ];

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `${p.nickname}`,
          description: lines.filter(Boolean).join("\n"),
          thumbnailUrl: p.avatarUrl ?? undefined,
        }),
      ],
    });
  },
};
