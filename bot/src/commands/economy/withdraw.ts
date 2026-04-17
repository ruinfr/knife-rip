import { ecoM } from "../../lib/economy/custom-emojis";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import {
  applyBankInterestIfAny,
  ledgerBankMove,
} from "../../lib/economy/bank-touch";
import { formatCash, parsePositiveBigInt } from "../../lib/economy/money";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

export const withdrawCommand: ArivixCommand = {
  name: "withdraw",
  aliases: ["wd", "take"],
  description: "Move Arivix Cash from bank to wallet (applies lazy interest first)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".withdraw <amount> · .wd · .take",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Run **`.withdraw`** in a **server text channel** (not DMs).",
          ),
        ],
      });
      return;
    }

    const raw = args[0];
    const amount = raw ? parsePositiveBigInt(raw) : null;
    if (!amount) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **`.withdraw <amount>`** (positive whole number)."),
        ],
      });
      return;
    }

    const uid = message.author.id;
    const prisma = getBotPrisma();
    const now = Date.now();

    try {
      const res = await prisma.$transaction(async (tx) => {
        await applyBankInterestIfAny(tx, uid, now);
        const u = await tx.economyUser.findUnique({ where: { discordUserId: uid } });
        if (!u) throw new Error("NOUSER");
        if (u.bankCash < amount) throw new Error("LOW");
        const cashAfter = u.cash + amount;
        const bankAfter = u.bankCash - amount;
        await ledgerBankMove(tx, {
          discordUserId: uid,
          cashDelta: amount,
          bankAfter,
          cashAfter,
          meta: { op: "withdraw" },
        });
        return { cashAfter, bankAfter };
      });

      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.bank} Bank withdraw`,
            description:
              `Withdrew **${formatCash(amount)}**.\n` +
              `Cash: **${formatCash(res.cashAfter)}** · Bank: **${formatCash(res.bankAfter)}**.`,
          }),
        ],
      });
    } catch (e) {
      if (e instanceof Error && e.message === "LOW") {
        await message.reply({
          embeds: [errorEmbed("You don't have that much in the bank.")],
        });
        return;
      }
      throw e;
    }
  },
};
