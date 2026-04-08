import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

type Microlink = {
  data?: { screenshot?: { url?: string }; title?: string };
  status?: string;
};

export const screenshotCommand: KnifeCommand = {
  name: "screenshot",
  aliases: ["webshot", "ss"],
  description: "Screenshot a public web page (Microlink API — no key required for light use)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Media and web.",
    usage: ".screenshot <https://…>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const raw = args.join(" ").trim();
    if (!/^https?:\/\//i.test(raw)) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **.screenshot** `https://…` (must start with http/https)"),
        ],
      });
      return;
    }

    const api = `https://api.microlink.io?url=${encodeURIComponent(raw)}&screenshot=true`;

    let res: Response;
    try {
      res = await fetch(api);
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not reach the screenshot service.")],
      });
      return;
    }

    const json = (await res.json()) as Microlink;
    const shot = json.data?.screenshot?.url;
    if (!shot) {
      await message.reply({
        embeds: [
          errorEmbed(
            "No screenshot returned (page may block bots, require login, or the service is busy).",
          ),
        ],
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(json.data?.title ?? "Screenshot")
      .setImage(shot)
      .setURL(raw);

    await message.reply({ embeds: [embed] });
  },
};
