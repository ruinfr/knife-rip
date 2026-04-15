import { formatCash, parsePositiveBigInt } from "../../lib/economy/money";
import { economyLogEmbed, sendEconomyLog } from "../../lib/economy/log";
import { applyCashDelta } from "../../lib/economy/wallet";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { isCommandOwnerBypass } from "../../lib/owner-bypass";
import type { KnifeCommand } from "../types";

/** Hard cap so one command does not run unbounded transactions. */
const MAX_RECIPIENTS = 10_000;

function parsePositiveInt(raw: string): number | null {
  const t = raw.replace(/[,_\s]/g, "").trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isSafeInteger(n) || n < 1) return null;
  return n;
}

export const messagedropCommand: KnifeCommand = {
  name: "messagedrop",
  description:
    "Bot owner only — grant Arivix Cash to every user with at least N lifetime tracked messages",
  aliases: ["msgdrop", "drop"],
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".messagedrop <min_messages> <amount>",
    tier: "free",
    style: "prefix",
    developerOnly: true,
  },
  async run({ message, args }) {
    if (!(await isCommandOwnerBypass(message.author.id))) {
      await message.reply({
        embeds: [
          errorEmbed("🔒 **`.messagedrop`** is **bot owner** only."),
        ],
      });
      return;
    }

    const minMsgs = parsePositiveInt(args[0] ?? "");
    const amount = parsePositiveBigInt(args[1] ?? "");
    if (!minMsgs || !amount) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **`.messagedrop`** `min_messages` `amount`\n" +
              "Everyone with **at least** that many **lifetime** tracked messages (all servers, not DMs) gets **amount** Arivix Cash.\n" +
              "Example: **`.messagedrop 5000 250`**",
          ),
        ],
      });
      return;
    }

    const prisma = getBotPrisma();
    const where = { lifetimeMessages: { gte: minMsgs } };
    const total = await prisma.economyUser.count({ where });
    if (total === 0) {
      await message.reply({
        embeds: [
          errorEmbed(
            `No economy users have **≥ ${minMsgs.toLocaleString()}** lifetime messages.`,
          ),
        ],
      });
      return;
    }
    if (total > MAX_RECIPIENTS) {
      await message.reply({
        embeds: [
          errorEmbed(
            `Too many recipients (**${total.toLocaleString()}**). Raise **min_messages** so at most **${MAX_RECIPIENTS.toLocaleString()}** users match, or split into multiple drops.`,
          ),
        ],
      });
      return;
    }

    const ch = message.channel;
    if (ch.isTextBased() && "sendTyping" in ch) {
      void ch.sendTyping().catch(() => {});
    }

    const status = await message.reply({
      content: `Processing **${total.toLocaleString()}** payouts (**${formatCash(amount)}** each)…`,
    });

    let done = 0;
    let failed = 0;
    let cursor: string | undefined;

    try {
      while (true) {
        const batch = await prisma.economyUser.findMany({
          where,
          select: { discordUserId: true },
          take: 200,
          orderBy: { discordUserId: "asc" },
          ...(cursor
            ? { cursor: { discordUserId: cursor }, skip: 1 }
            : {}),
        });
        if (batch.length === 0) break;

        for (const row of batch) {
          try {
            await applyCashDelta({
              discordUserId: row.discordUserId,
              delta: amount,
              reason: "message_drop",
              actorUserId: message.author.id,
              meta: {
                minLifetimeMessages: minMsgs,
                bulkIndex: done,
              },
            });
            done += 1;
          } catch {
            failed += 1;
          }
        }

        cursor = batch[batch.length - 1]!.discordUserId;
        if (done % 400 === 0 && done > 0) {
          await status
            .edit({
              content: `Paid **${done.toLocaleString()}** / **${total.toLocaleString()}**…`,
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      await status.edit({
        content: null,
        embeds: [
          errorEmbed(
            e instanceof Error ? e.message : "Drop failed partway through.",
          ),
        ],
      });
      return;
    }

    const totalPaid = amount * BigInt(done);
    await status
      .edit({
        content: null,
        embeds: [
          minimalEmbed({
            title: "✅ Message drop complete",
            description:
              `**Min messages:** ≥ **${minMsgs.toLocaleString()}** lifetime\n` +
              `**Paid:** **${done.toLocaleString()}** × **${formatCash(amount)}** = **${formatCash(totalPaid)}**` +
              (failed > 0
                ? `\n**Skipped (errors):** ${failed.toLocaleString()}`
                : ""),
          }),
        ],
      })
      .catch(() => {});

    void sendEconomyLog(
      message.client,
      economyLogEmbed(
        "👑 messagedrop",
        `<@${message.author.id}> paid **${formatCash(amount)}** to **${done.toLocaleString()}** users (min **${minMsgs.toLocaleString()}** lifetime msgs). Total **${formatCash(totalPaid)}**.` +
          (failed > 0 ? ` Failed: **${failed}**.` : ""),
      ),
    );
  },
};
