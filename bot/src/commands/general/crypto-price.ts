import { EmbedBuilder } from "discord.js";
import { getSiteApiBase } from "../../config";
import { errorEmbed } from "../../lib/embeds";
import {
  fetchSimplePrice,
  resolveCoingeckoId,
} from "../../lib/crypto/coingecko";
import type { KnifeCommand } from "../types";

export const cryptoCommand: KnifeCommand = {
  name: "crypto",
  aliases: ["coin", "coingecko", "price"],
  description: "Spot price for a cryptocurrency (CoinGecko — fiat or major crypto pair)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Crypto and on-chain tools.",
    usage: ".crypto <symbol or name> [usd|eur|gbp|btc|eth|…]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (args.length < 1) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.crypto** `btc` · **.crypto** `ethereum` `eur`\n" +
              "Uses CoinGecko public API (rate limits apply).",
          ),
        ],
      });
      return;
    }

    const q = args[0].trim();
    const vs = (args[1] ?? "usd").trim();

    const id = await resolveCoingeckoId(q);
    if (!id) {
      await message.reply({
        embeds: [
          errorEmbed(
            `Could not resolve **${q}** on CoinGecko — try another spelling or ticker.`,
          ),
        ],
      });
      return;
    }

    const price = await fetchSimplePrice(id, vs);
    if (!price) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Price lookup failed — CoinGecko may be rate-limiting or the pair is unsupported.",
          ),
        ],
      });
      return;
    }

    const origin = getSiteApiBase();
    const sym = price.vs.toUpperCase();
    const formatted =
      price.price >= 1
        ? price.price.toLocaleString("en-US", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })
        : price.price.toLocaleString("en-US", {
            maximumFractionDigits: 8,
            minimumFractionDigits: 2,
          });

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf7931a)
          .setTitle(`${id.replace(/-/g, " ")}`)
          .setDescription(
            `**${formatted}** ${sym}\n\n` +
              `[CoinGecko](https://www.coingecko.com/en/coins/${id}) · [commands](${origin}/commands)`,
          ),
      ],
    });
  },
};
