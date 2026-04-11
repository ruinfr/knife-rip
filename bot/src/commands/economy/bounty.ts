import { ecoM } from "../../lib/economy/custom-emojis";
import {
  BOUNTY_MAX_AMOUNT,
  BOUNTY_MIN_AMOUNT,
  BOUNTY_POST_FEE_PCT,
} from "../../lib/economy/economy-tuning";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { formatCash, parsePositiveBigInt } from "../../lib/economy/money";
import {
  creditTreasuryInTx,
  type LedgerReason,
} from "../../lib/economy/wallet";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const bountyCommand: KnifeCommand = {
  name: "bounty",
  aliases: ["hit", "contract"],
  description:
    "Post Knife Cash on someone's head — paid automatically if you **successfully `.rob`** them here (treasury holds escrow)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage:
      ".bounty @user <amount> · .hit · .bounty list · .bounty cancel",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.bounty`** in a **server text channel** (not DMs)."),
        ],
      });
      return;
    }

    const uid = message.author.id;
    const guildId = message.guild!.id;
    const prisma = getBotPrisma();
    const sub = args[0]?.toLowerCase();

    if (sub === "list") {
      const rows = await prisma.economyBounty.findMany({
        where: { guildId, status: "open" },
        orderBy: { createdAt: "desc" },
        take: 12,
      });
      if (rows.length === 0) {
        await message.reply({
          embeds: [
            minimalEmbed({
              title: `${ecoM.cash} Open bounties`,
              description: "_No open bounties in this server._",
            }),
          ],
        });
        return;
      }
      const lines = rows.map(
        (r) =>
          `• **${formatCash(r.amount)}** on <@${r.targetDiscordId}> — by <@${r.posterDiscordId}>`,
      );
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.cash} Open bounties`,
            description:
              lines.join("\n") +
              "\n\n_Paid to a successful **`.rob`** in this server (oldest matching bounty first)._",
          }),
        ],
      });
      return;
    }

    if (sub === "cancel") {
      try {
        const res = await prisma.$transaction(async (tx) => {
          const b = await tx.economyBounty.findFirst({
            where: {
              guildId,
              posterDiscordId: uid,
              status: "open",
            },
            orderBy: { createdAt: "desc" },
          });
          if (!b) throw new Error("NONE");
          const amount = b.amount;
          await creditTreasuryInTx(tx, {
            delta: -amount,
            reason: "bounty",
            meta: { kind: "bounty_refund_escrow", bountyId: b.id },
            actorUserId: uid,
          });
          const poster = await tx.economyUser.findUnique({
            where: { discordUserId: uid },
          });
          if (!poster) throw new Error("NOUSER");
          const cashAfter = poster.cash + amount;
          await tx.economyUser.update({
            where: { discordUserId: uid },
            data: { cash: cashAfter },
          });
          await tx.economyLedger.create({
            data: {
              discordUserId: uid,
              delta: amount,
              balanceAfter: cashAfter,
              reason: "bounty" satisfies LedgerReason,
              meta: { op: "cancel_refund", bountyId: b.id },
            },
          });
          await tx.economyBounty.update({
            where: { id: b.id },
            data: { status: "cancelled", fulfilledAt: new Date() },
          });
          return { amount, cashAfter };
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: `${ecoM.cash} Bounty cancelled`,
              description:
                `Refunded **${formatCash(res.amount)}** from escrow.\nBalance: **${formatCash(res.cashAfter)}**.\n_(Posting fee is not refunded.)_`,
            }),
          ],
        });
      } catch (e) {
        if (e instanceof Error && e.message === "NONE") {
          await message.reply({
            embeds: [errorEmbed("You have no open bounty here to cancel.")],
          });
          return;
        }
        throw e;
      }
      return;
    }

    const target = message.mentions.users.first();
    if (!target || target.bot) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **`.bounty @user <amount>`** · **`.bounty list`** · **`.bounty cancel`**",
          ),
        ],
      });
      return;
    }

    const amtRaw = args.find((a) => /^\d/.test(a));
    const amount = amtRaw ? parsePositiveBigInt(amtRaw.replace(/[,_\s]/g, "")) : null;
    if (!amount || amount < BOUNTY_MIN_AMOUNT || amount > BOUNTY_MAX_AMOUNT) {
      await message.reply({
        embeds: [
          errorEmbed(
            `Amount must be between **${formatCash(BOUNTY_MIN_AMOUNT)}** and **${formatCash(BOUNTY_MAX_AMOUNT)}**.`,
          ),
        ],
      });
      return;
    }

    if (target.id === uid) {
      await message.reply({
        embeds: [errorEmbed("Put a bounty on someone else.")],
      });
      return;
    }

    const fee = (amount * BigInt(BOUNTY_POST_FEE_PCT) + 99n) / 100n;
    const total = amount + fee;

    try {
      const cashAfter = await prisma.$transaction(async (tx) => {
        const u = await tx.economyUser.upsert({
          where: { discordUserId: uid },
          create: { discordUserId: uid },
          update: {},
        });
        if (u.cash < total) throw new Error("POOR");
        const next = u.cash - total;
        await tx.economyUser.update({
          where: { discordUserId: uid },
          data: { cash: next },
        });
        await tx.economyLedger.create({
          data: {
            discordUserId: uid,
            delta: -total,
            balanceAfter: next,
            reason: "bounty" satisfies LedgerReason,
            meta: {
              op: "post",
              target: target.id,
              amount: amount.toString(),
              fee: fee.toString(),
            },
          },
        });
        await creditTreasuryInTx(tx, {
          delta: total,
          reason: "bounty",
          meta: {
            kind: "bounty_escrow",
            poster: uid,
            target: target.id,
            amount: amount.toString(),
            fee: fee.toString(),
          },
          actorUserId: uid,
        });
        await tx.economyBounty.create({
          data: {
            posterDiscordId: uid,
            targetDiscordId: target.id,
            amount,
            guildId,
            status: "open",
          },
        });
        return next;
      });

      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.cash} Bounty posted`,
            description:
              `**${formatCash(amount)}** on <@${target.id}> (+ **${formatCash(fee)}** posting fee).\n` +
              `Balance: **${formatCash(cashAfter)}**.\n` +
              `_Whoever **successfully robs** them in this server claims it (oldest bounty first)._`,
          }),
        ],
      });
    } catch (e) {
      if (e instanceof Error && e.message === "POOR") {
        await message.reply({
          embeds: [
            errorEmbed(
              `Need **${formatCash(total)}** (bounty + **${BOUNTY_POST_FEE_PCT}%** fee).`,
            ),
          ],
        });
        return;
      }
      throw e;
    }
  },
};
