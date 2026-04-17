import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

type DictSense = {
  definitions?: { definition: string }[];
  partOfSpeech?: string;
};

type DictEntry = {
  word: string;
  meanings?: DictSense[];
};

export const defineCommand: ArivixCommand = {
  name: "define",
  aliases: ["dictionary", "dict"],
  description: "English dictionary definition (Free Dictionary API)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and lookups.",
    usage: ".define <word>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const word = args.join(" ").trim();
    if (!word) {
      await message.reply({
        embeds: [errorEmbed("Usage: **.define** `word`")],
      });
      return;
    }

    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not reach the dictionary API.")],
      });
      return;
    }

    if (!res.ok) {
      await message.reply({
        embeds: [errorEmbed("No definition found for that word.")],
      });
      return;
    }

    const data = (await res.json()) as DictEntry[];
    const entry = data[0];
    if (!entry?.meanings?.length) {
      await message.reply({
        embeds: [errorEmbed("No usable definitions in the response.")],
      });
      return;
    }

    const lines: string[] = [];
    let n = 0;
    for (const sense of entry.meanings) {
      const pos = sense.partOfSpeech ? `*(${sense.partOfSpeech})* ` : "";
      const defs = sense.definitions ?? [];
      for (const d of defs) {
        if (n >= 6) break;
        lines.push(`${pos}${d.definition}`);
        n += 1;
      }
      if (n >= 6) break;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(entry.word)
      .setDescription(lines.join("\n\n").slice(0, 3900));

    await message.reply({ embeds: [embed] });
  },
};
