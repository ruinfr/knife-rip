import { EmbedBuilder } from "discord.js";
import { getOpenWeatherApiKey } from "../../config";
import { errorEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

type OwCurrent = {
  name: string;
  sys?: { country?: string };
  main: { temp: number; feels_like: number; humidity: number };
  weather?: { description: string }[];
  wind?: { speed: number };
};

export const weatherCommand: ArivixCommand = {
  name: "weather",
  aliases: ["wttr"],
  description: "Current weather from OpenWeatherMap (requires API key on bot host)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Lookups.",
    usage: ".weather <city>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const key = getOpenWeatherApiKey();
    if (!key) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Weather is not configured (`OPENWEATHER_API_KEY`) on this bot instance.",
          ),
        ],
      });
      return;
    }

    const city = args.join(" ").trim();
    if (!city) {
      await message.reply({
        embeds: [errorEmbed("Usage: **.weather** `City` (optionally `City,CC`)")],
      });
      return;
    }

    const url =
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}` +
      `&appid=${encodeURIComponent(key)}&units=metric`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not reach OpenWeatherMap.")],
      });
      return;
    }

    const data = (await res.json()) as OwCurrent & { message?: string };
    if (!res.ok) {
      await message.reply({
        embeds: [
          errorEmbed(data.message ?? "City not found — try adding a country code."),
        ],
      });
      return;
    }

    const desc = data.weather?.[0]?.description ?? "";
    const embed = new EmbedBuilder()
      .setColor(0x5dade2)
      .setTitle(`${data.name}${data.sys?.country ? `, ${data.sys.country}` : ""}`)
      .setDescription(desc)
      .addFields(
        {
          name: "Temp",
          value: `${Math.round(data.main.temp)}°C`,
          inline: true,
        },
        {
          name: "Feels like",
          value: `${Math.round(data.main.feels_like)}°C`,
          inline: true,
        },
        {
          name: "Humidity",
          value: `${data.main.humidity}%`,
          inline: true,
        },
        {
          name: "Wind",
          value: data.wind?.speed != null ? `${data.wind.speed} m/s` : "—",
          inline: true,
        },
      );

    await message.reply({ embeds: [embed] });
  },
};
