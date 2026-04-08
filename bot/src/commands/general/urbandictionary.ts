import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

type UdResult = {
  list?: {
    word: string;
    definition: string;
    example?: string;
    thumbs_up?: number;
    thumbs_down?: number;
    permalink?: string;
  }[];
};

export const urbandictionaryCommand: KnifeCommand = {
  name: "urbandictionary",
  aliases: ["urban", "ud"],
  description: "Urban Dictionary definition for slang or phrases",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and lookups.",
    usage: ".urbandictionary <term> · .ud <term>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const term = args.join(" ").trim();
    if (!term) {
      await message.reply({
        embeds: [errorEmbed("Usage: **.urbandictionary** `term`")],
      });
      return;
    }

    const url = `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not reach Urban Dictionary.")],
      });
      return;
    }

    if (!res.ok) {
      await message.reply({
        embeds: [errorEmbed("Urban Dictionary request failed.")],
      });
      return;
    }

    const data = (await res.json()) as UdResult;
    const top = data.list?.[0];
    if (!top) {
      await message.reply({
        embeds: [errorEmbed("No entries found for that term.")],
      });
      return;
    }

    const clean = (s: string) =>
      s
        .replace(/\[/g, "")
        .replace(/\]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const embed = new EmbedBuilder()
      .setColor(0xfe6e00)
      .setTitle(top.word)
      .setDescription(clean(top.definition).slice(0, 3500))
      .setFooter({
        text:
          `👍 ${top.thumbs_up ?? 0} · 👎 ${top.thumbs_down ?? 0}` +
          (top.permalink ? ` · ${top.permalink}` : ""),
      });

    if (top.example) {
      embed.addFields({
        name: "Example",
        value: clean(top.example).slice(0, 1000),
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
