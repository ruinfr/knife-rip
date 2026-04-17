import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import { getSiteApiBase } from "../../config";
import type { ArivixCommand } from "../types";

const BTC_TX = /^[a-fA-F0-9]{64}$/;
const MAX_WATCHES_PER_USER = 5;

async function mempoolTxExists(txHash: string): Promise<boolean> {
  const res = await fetch(`https://mempool.space/api/tx/${txHash}`);
  return res.ok;
}

async function mempoolConfirmed(txHash: string): Promise<boolean | null> {
  const res = await fetch(`https://mempool.space/api/tx/${txHash}/status`);
  if (!res.ok) return null;
  const j = (await res.json()) as { confirmed?: boolean };
  return Boolean(j.confirmed);
}

export const subscribeCommand: ArivixCommand = {
  name: "subscribe",
  aliases: ["btcwatch", "txwatch", "btctxwatch"],
  description:
    "Watch a **Bitcoin** tx for **one confirmation** — bot DMs you (or pings in channel if DMs closed)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Crypto and on-chain tools.",
    usage: ".subscribe <btc_txid>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const hash = args.join(" ").trim().toLowerCase();
    if (!hash || !BTC_TX.test(hash)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Provide a valid **64-character Bitcoin transaction id** (hex).\n" +
              "Only **BTC** via mempool.space is supported for this command.",
          ),
        ],
      });
      return;
    }

    let prisma;
    try {
      prisma = getBotPrisma();
    } catch {
      await message.reply({
        embeds: [errorEmbed("Database unavailable — cannot save watches.")],
      });
      return;
    }

    const existingCount = await prisma.botBtcTxWatch.count({
      where: { userId: message.author.id },
    });
    if (existingCount >= MAX_WATCHES_PER_USER) {
      await message.reply({
        embeds: [
          errorEmbed(
            `You already have **${MAX_WATCHES_PER_USER}** active BTC watches — wait for one to confirm or ask an admin to purge DB.`,
          ),
        ],
      });
      return;
    }

    if (!(await mempoolTxExists(hash))) {
      await message.reply({
        embeds: [
          errorEmbed(
            "mempool.space does not know that tx yet — check the id or wait for propagation.",
          ),
        ],
      });
      return;
    }

    const conf = await mempoolConfirmed(hash);
    if (conf === true) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Already confirmed",
            description:
              `That transaction already has at least one confirmation.\nhttps://mempool.space/tx/${hash}`,
          }),
        ],
      });
      return;
    }

    try {
      await prisma.botBtcTxWatch.create({
        data: {
          userId: message.author.id,
          guildId: message.guildId,
          channelId: message.guildId ? message.channelId : null,
          txHash: hash,
        },
      });
    } catch (e) {
      const dup =
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code?: string }).code === "P2002";
      await message.reply({
        embeds: [
          errorEmbed(
            dup
              ? "You are already watching that transaction."
              : `Could not save watch: ${String(e)}`,
          ),
        ],
      });
      return;
    }

    const origin = getSiteApiBase();
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Subscribed",
          description:
            `Watching **\`${hash.slice(0, 10)}…\`** for first confirmation (checked about every minute).\n` +
              `Open DMs from the bot for the notice — otherwise I will try this channel.\n` +
              `[mempool](https://mempool.space/tx/${hash}) · [commands](${origin}/commands)`,
        }),
      ],
    });
  },
};
