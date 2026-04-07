import { formatCash, parsePositiveBigInt } from "../../lib/economy/money";
import { economyLogEmbed, sendEconomyLog } from "../../lib/economy/log";
import { applyCashDelta, setCashAbsolute } from "../../lib/economy/wallet";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { isCommandOwnerBypass } from "../../lib/owner-bypass";
import type { KnifeCommand } from "../types";

function parseNonNegativeBigInt(raw: string): bigint | null {
  const t = raw.replace(/[,_\s]/g, "").trim();
  if (!/^\d+$/.test(t)) return null;
  return BigInt(t);
}

export const gcashCommand: KnifeCommand = {
  name: "gcash",
  description:
    "Bot owner only — add, remove, or set a user’s global Knife Cash balance",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Knife Cash (global wallet), shop, house games, and transfers — virtual currency for fun.",
    usage: ".gcash add @user <amount> · .gcash remove … · .gcash set …",
    tier: "free",
    style: "prefix",
    developerOnly: true,
  },
  async run({ message, args }) {
    if (!(await isCommandOwnerBypass(message.author.id))) {
      await message.reply({
        embeds: [errorEmbed("🔒 **`.gcash`** is **bot owner** only.")],
      });
      return;
    }

    const sub = args[0]?.toLowerCase();
    if (sub !== "add" && sub !== "remove" && sub !== "set") {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **`.gcash add`** `@user` `amount` · **`.gcash remove`** … · **`.gcash set`** …\n" +
              "Use a mention or put the user ID as the first argument after the subcommand.",
          ),
        ],
      });
      return;
    }

    const mention = message.mentions.users.first();
    let targetId = mention?.id ?? null;
    let amountStr: string | undefined;
    if (targetId) {
      amountStr = args[2];
    } else if (args[1] && /^\d{17,20}$/.test(args[1])) {
      targetId = args[1];
      amountStr = args[2];
    }
    if (!targetId) {
      await message.reply({
        embeds: [
          errorEmbed("Mention a user or pass a **Discord user ID**."),
        ],
      });
      return;
    }

    const amt = parsePositiveBigInt(amountStr ?? "");
    if (!amt && sub !== "set") {
      await message.reply({
        embeds: [errorEmbed("Provide a positive **amount** (whole cash).")],
      });
      return;
    }

    try {
      if (sub === "add" && amt) {
        const after = await applyCashDelta({
          discordUserId: targetId,
          delta: amt,
          reason: "owner_add",
          actorUserId: message.author.id,
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "✅ Cash added",
              description:
                `<@${targetId}> **+${formatCash(amt)}** → balance **${formatCash(after)}**.`,
            }),
          ],
        });
        void sendEconomyLog(
          message.client,
          economyLogEmbed(
            "👑 gcash add",
            `<@${message.author.id}> added **${formatCash(amt)}** → <@${targetId}> (now **${formatCash(after)}**).`,
          ),
        );
        return;
      }
      if (sub === "remove" && amt) {
        const after = await applyCashDelta({
          discordUserId: targetId,
          delta: -amt,
          reason: "owner_remove",
          actorUserId: message.author.id,
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "✅ Cash removed",
              description:
                `<@${targetId}> **−${formatCash(amt)}** → balance **${formatCash(after)}**.`,
            }),
          ],
        });
        void sendEconomyLog(
          message.client,
          economyLogEmbed(
            "👑 gcash remove",
            `<@${message.author.id}> removed **${formatCash(amt)}** from <@${targetId}> (now **${formatCash(after)}**).`,
          ),
        );
        return;
      }
      if (sub === "set") {
        const setAmt = parseNonNegativeBigInt(amountStr ?? "");
        if (setAmt === null) {
          await message.reply({
            embeds: [
              errorEmbed(
                "**`.gcash set`** needs a numeric amount (0 or more).",
              ),
            ],
          });
          return;
        }
        const after = await setCashAbsolute({
          discordUserId: targetId,
          target: setAmt,
          actorUserId: message.author.id,
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "✅ Balance set",
              description:
                `<@${targetId}> is now **${formatCash(after)}** cash.`,
            }),
          ],
        });
        void sendEconomyLog(
          message.client,
          economyLogEmbed(
            "👑 gcash set",
            `<@${message.author.id}> set <@${targetId}> to **${formatCash(after)}**.`,
          ),
        );
        return;
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "INSUFFICIENT_FUNDS"
          ? "That user doesn’t have enough cash to remove that much."
          : "Could not update balance.";
      await message.reply({ embeds: [errorEmbed(msg)] });
    }
  },
};
