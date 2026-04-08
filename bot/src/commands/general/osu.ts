import { EmbedBuilder } from "discord.js";
import { getOsuLegacyApiKey } from "../../config";
import { errorEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

type OsuUserRow = {
  username: string;
  user_id: string;
  pp_rank: string;
  pp_country_rank: string;
  country: string;
  pp_raw: string;
  level: string;
  playcount: string;
};

const MODE_MAP: Record<string, string> = {
  osu: "0",
  std: "0",
  standard: "0",
  taiko: "1",
  ctb: "2",
  catch: "2",
  mania: "3",
};

export const osuCommand: KnifeCommand = {
  name: "osu",
  aliases: ["osuuser"],
  description: "Basic osu! profile (legacy osu!api v1 — requires server key)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Game and profile lookups.",
    usage: ".osu <username> [mode: osu|taiko|ctb|mania]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const key = getOsuLegacyApiKey();
    if (!key) {
      await message.reply({
        embeds: [
          errorEmbed(
            "osu! stats are not configured on this bot instance (`OSU_LEGACY_API_KEY`).",
          ),
        ],
      });
      return;
    }

    if (args.length < 1) {
      await message.reply({
        embeds: [errorEmbed("Usage: **.osu** `username` `[mode]`")],
      });
      return;
    }

    let mode = "0";
    let nameParts = [...args];
    const last = args[args.length - 1]?.toLowerCase();
    if (last && MODE_MAP[last] !== undefined) {
      mode = MODE_MAP[last];
      nameParts = args.slice(0, -1);
    }
    const username = nameParts.join(" ").trim();
    if (!username) {
      await message.reply({
        embeds: [errorEmbed("Provide a **username** to look up.")],
      });
      return;
    }

    const url =
      `https://osu.ppy.sh/api/get_user?k=${encodeURIComponent(key)}` +
      `&u=${encodeURIComponent(username)}&m=${mode}&type=string`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not reach the osu! API.")],
      });
      return;
    }

    if (!res.ok) {
      await message.reply({
        embeds: [errorEmbed("osu! API returned an error.")],
      });
      return;
    }

    const data = (await res.json()) as OsuUserRow[];
    const u = data[0];
    if (!u) {
      await message.reply({
        embeds: [errorEmbed("User not found for that name.")],
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff66aa)
      .setTitle(`${u.username} (${u.user_id})`)
      .addFields(
        { name: "PP", value: u.pp_raw ?? "—", inline: true },
        { name: "Global rank", value: `#${u.pp_rank}`, inline: true },
        {
          name: "Country",
          value: `${u.country} (#${u.pp_country_rank})`,
          inline: true,
        },
        { name: "Level", value: u.level ?? "—", inline: true },
        { name: "Playcount", value: u.playcount ?? "—", inline: true },
      );

    await message.reply({ embeds: [embed] });
  },
};
