import { minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

function formatUptime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (d || h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(" ");
}

export const uptimeCommand: ArivixCommand = {
  name: "uptime",
  aliases: ["up"],
  description: "How long the bot process has been running",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".uptime · .up",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const sec = process.uptime();
    const embed = minimalEmbed({
      title: "Uptime",
      description: `**${formatUptime(sec)}** since this bot started.`,
    });
    await message.reply({ embeds: [embed] });
  },
};
