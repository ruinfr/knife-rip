import { ecoM } from "../../lib/economy/custom-emojis";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import {
  applyBankInterestIfAny,
  effectiveBankCapForUser,
  ledgerBankMove,
} from "../../lib/economy/bank-touch";
import { formatCash, parsePositiveBigInt } from "../../lib/economy/money";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

export const depositCommand: ArivixCommand = {
  name: "deposit",
  aliases: ["dep", "save"],
  description: "Move Arivix Cash from wallet into the bank (lazy interest, tier cap)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".deposit <amount> · .dep · .save",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Run **`.deposit`** in a **server text channel** (not DMs).",
          ),
        ],
      });
      return;
    }

    const raw = args[0];
    const amount = raw ? parsePositiveBigInt(raw) : null;
    if (!amount) {
      await message.reply({
        embeds: [errorEmbed("Usage: **`.deposit <amount>`** (positive whole number).")],
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
        if (u.cash < amount) throw new Error("POOR");
        const cap = effectiveBankCapForUser(u);
        const room = cap - u.bankCash;
        if (room < amount) throw new Error(`FULL:${room.toString()}`);
        const cashAfter = u.cash - amount;
        const bankAfter = u.bankCash + amount;
        await ledgerBankMove(tx, {
          discordUserId: uid,
          cashDelta: -amount,
          bankAfter,
          cashAfter,
          meta: { op: "deposit" },
        });
        return { cashAfter, bankAfter, cap };
      });

      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.bank} Bank deposit`,
            description:
              `Deposited **${formatCash(amount)}**.\n` +
              `Cash: **${formatCash(res.cashAfter)}** · Bank: **${formatCash(res.bankAfter)}** / **${formatCash(res.cap)}**.`,
          }),
        ],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "POOR") {
        await message.reply({
          embeds: [errorEmbed("Not enough cash in your wallet.")],
        });
        return;
      }
      if (msg.startsWith("FULL:")) {
        const room = BigInt(msg.slice(5));
        await message.reply({
          embeds: [
            errorEmbed(
              room <= 0n
                ? "Your bank is full for this tier — **`.bank upgrade`** for a higher cap."
                : `You can only deposit **${formatCash(room)}** more (tier cap).`,
            ),
          ],
        });
        return;
      }
      throw e;
    }
  },
};
