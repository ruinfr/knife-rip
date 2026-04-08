import { minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const pingCommand: KnifeCommand = {
  name: "ping",
  aliases: ["latency", "ms"],
  description: "Check bot and Discord gateway latency",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".ping",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const loading = minimalEmbed({
      title: "Pong",
      description: "Measuring…",
    });
    const sent = await message.reply({ embeds: [loading] });

    const ws = message.client.ws.ping;
    const rtt = sent.createdTimestamp - message.createdTimestamp;
    const done = minimalEmbed({
      title: "Pong",
      description: `Gateway **${ws}** ms · round-trip **${rtt}** ms`,
    });

    await sent.edit({ embeds: [done] });
  },
};
