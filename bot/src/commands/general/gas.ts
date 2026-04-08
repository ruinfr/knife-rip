import { EmbedBuilder } from "discord.js";
import { getSiteApiBase } from "../../config";
import { errorEmbed } from "../../lib/embeds";
import { fetchGasOracle } from "../../lib/crypto/gas-prices";
import type { KnifeCommand } from "../types";

export const gasCommand: KnifeCommand = {
  name: "gas",
  aliases: ["ethgas", "gwei", "gasprice"],
  description: "Ethereum mainnet gas suggestions (Etherscan oracle or public RPC fallback)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Crypto and on-chain tools.",
    usage: ".gas",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const oracle = await fetchGasOracle();
    if (!oracle) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Could not load gas data — try setting **ETHERSCAN_API_KEY** for the bot, or retry later.",
          ),
        ],
      });
      return;
    }

    const origin = getSiteApiBase();
    const base =
      oracle.baseFeeGwei != null
        ? `\n**Base fee (EIP-1559):** ~${oracle.baseFeeGwei} Gwei`
        : "";

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x627eea)
          .setTitle("Ethereum gas (Gwei)")
          .setDescription(
            `**Safe:** ${oracle.safe}\n` +
              `**Standard:** ${oracle.proposed}\n` +
              `**Fast:** ${oracle.fast}${base}\n\n` +
              `[Etherscan gas oracle](https://etherscan.io/gastracker) · [commands](${origin}/commands)`,
          ),
      ],
    });
  },
};
