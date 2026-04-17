import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { fetchRobloxProfile } from "../../lib/roblox-api";
import type { ArivixCommand } from "../types";

const ABOUT_MAX = 500;

export const robloxCommand: ArivixCommand = {
  name: "roblox",
  aliases: ["rblx"],
  description: "Roblox profile — lookup by username",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".roblox username · .rblx",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const query = args.join(" ").trim();
    if (!query) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **.roblox** `username` · **.rblx**"),
        ],
      });
      return;
    }

    const result = await fetchRobloxProfile(query);
    if (!result.ok) {
      await message.reply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    const p = result.data;
    const profileUrl = `https://www.roblox.com/users/${p.id}/profile`;
    const verified = p.hasVerifiedBadge ? " ✓" : "";
    const banned = p.isBanned ? "\n**Status:** Banned" : "";

    let about = p.description || "*No about*";
    if (about.length > ABOUT_MAX) {
      about = `${about.slice(0, ABOUT_MAX - 1)}…`;
    }

    let createdLine = "";
    if (p.createdIso) {
      const sec = Math.floor(new Date(p.createdIso).getTime() / 1000);
      if (Number.isFinite(sec)) {
        createdLine = `**Created:** <t:${sec}:F> (<t:${sec}:R>)`;
      }
    }

    const lines = [
      `**[@${p.name}](${profileUrl})**${verified}`,
      `**Display name:** ${p.displayName}`,
      `**User ID:** ${p.id}`,
      createdLine,
      banned,
      "",
      `**About:** ${about}`,
    ].filter(Boolean);

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `${p.displayName}`,
          description: lines.join("\n"),
          thumbnailUrl: p.headshotUrl ?? undefined,
        }),
      ],
    });
  },
};
