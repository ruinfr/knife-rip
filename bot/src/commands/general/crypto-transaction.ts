import { EmbedBuilder } from "discord.js";
import { getEtherscanApiKey, getSiteApiBase } from "../../config";
import { errorEmbed } from "../../lib/embeds";
import { lookupTransaction } from "../../lib/crypto/transactions";
import type { KnifeCommand } from "../types";

export const transactionCommand: KnifeCommand = {
  name: "transaction",
  aliases: ["tx", "txinfo", "cryptotx"],
  description: "Look up a **BTC**, **LTC**, or **ETH** transaction by hash (public explorers)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Crypto and on-chain tools.",
    usage: ".transaction <txid|0x…>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const hash = args.join(" ").trim();
    if (!hash) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.transaction** `64-char hex` (BTC/LTC) or **0x…** (ETH).\n" +
              "ETH lookups work best with **ETHERSCAN_API_KEY** on the bot.",
          ),
        ],
      });
      return;
    }

    const data = await lookupTransaction(hash, getEtherscanApiKey());
    if (!data) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Transaction not found on **BTC** (mempool.space), **LTC** (Blockchair), or **ETH** (Etherscan).\n" +
              "Double-check the hash and network.",
          ),
        ],
      });
      return;
    }

    const origin = getSiteApiBase();
    const explorer =
      data.chain === "btc"
        ? `https://mempool.space/tx/${data.hash}`
        : data.chain === "ltc"
          ? `https://blockchair.com/litecoin/transaction/${data.hash}`
          : `https://etherscan.io/tx/${data.hash}`;

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`Transaction (${data.chain.toUpperCase()})`)
          .setDescription(
            `${data.summary}\n\n` +
              `**Hash:** \`${data.hash}\`\n` +
              `[Explorer](${explorer}) · [commands](${origin}/commands)`,
          ),
      ],
    });
  },
};
