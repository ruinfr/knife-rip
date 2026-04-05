import { getInstagramRapidApiHost, getInstagramRapidApiPath, getRapidApiKey } from "../../config";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import {
  fetchInstagramProfile,
  isPlausibleInstagramUsername,
  normalizeInstagramUsername,
} from "../../lib/instagram-api";
import type { KnifeCommand } from "../types";

const BIO_MAX = 450;

function fmtCount(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US");
}

export const instagramCommand: KnifeCommand = {
  name: "instagram",
  aliases: ["ig"],
  description: "Instagram profile — username (RapidAPI)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".instagram username · .ig @username",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const key = getRapidApiKey();
    if (!key) {
      await message.reply({
        embeds: [
          errorEmbed(
            "**.instagram** needs **RAPIDAPI_KEY** in `.env` (same key as `.tiktok`). Subscribe to an Instagram profile API on RapidAPI — default host **instagram130** (`/account-info`).",
          ),
        ],
      });
      return;
    }

    if (args.length > 1) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Instagram usernames have **no spaces** — use one handle, e.g. **.ig** `username`",
          ),
        ],
      });
      return;
    }

    const raw = normalizeInstagramUsername(args[0] ?? "");
    if (!raw) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **.instagram** `username` · **.ig** (no @ required)"),
        ],
      });
      return;
    }

    if (!isPlausibleInstagramUsername(raw)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "That doesn’t look like a valid Instagram username (letters, numbers, `.` and `_`, max 30).",
          ),
        ],
      });
      return;
    }

    const host = getInstagramRapidApiHost();
    const path = getInstagramRapidApiPath();
    const result = await fetchInstagramProfile(
      raw.toLowerCase(),
      key,
      host,
      path,
    );

    if (!result.ok) {
      await message.reply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    const p = result.data;
    const url = `https://www.instagram.com/${encodeURIComponent(p.username)}/`;
    const verified = p.isVerified ? " ✓" : "";
    const privacy = p.isPrivate ? "\n**Account:** Private" : "";
    let bio = p.biography || "*No bio*";
    if (bio.length > BIO_MAX) {
      bio = `${bio.slice(0, BIO_MAX - 1)}…`;
    }

    const lines = [
      `**[@${p.username}](${url})**${verified}`,
      `**Name:** ${p.fullName}`,
      `**Posts:** ${fmtCount(p.posts)} · **Followers:** ${fmtCount(p.followers)} · **Following:** ${fmtCount(p.following)}`,
      "",
      `**Bio:** ${bio}`,
    ];

    if (p.externalUrl) {
      lines.push(`**Link:** ${p.externalUrl}`);
    }
    lines.push(privacy);

    await message.reply({
      embeds: [
        minimalEmbed({
          title: p.fullName,
          description: lines.filter(Boolean).join("\n"),
          thumbnailUrl: p.profilePicUrl ?? undefined,
        }),
      ],
    });
  },
};
