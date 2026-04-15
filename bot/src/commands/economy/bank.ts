import { ecoM } from "../../lib/economy/custom-emojis";
import {
  applyBankInterestIfAny,
  effectiveBankCapForUser,
} from "../../lib/economy/bank-touch";
import {
  BANK_CAP_BY_TIER,
  BANK_DAILY_INTEREST_BPS,
  BANK_TIER_UPGRADE_COSTS,
} from "../../lib/economy/economy-tuning";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { formatCash } from "../../lib/economy/money";
import type { LedgerReason } from "../../lib/economy/wallet";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const bankCommand: KnifeCommand = {
  name: "bank",
  aliases: ["vault", "savings"],
  description:
    "View bank balance, tier cap, and lazy interest — or **`.bank upgrade`** for a higher cap",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".bank · .vault · .bank upgrade",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.bank`** in a **server text channel** (not DMs)."),
        ],
      });
      return;
    }

    const uid = message.author.id;
    const prisma = getBotPrisma();
    const now = Date.now();
    const sub = args[0]?.toLowerCase();

    if (sub === "upgrade") {
      try {
        const res = await prisma.$transaction(async (tx) => {
          await applyBankInterestIfAny(tx, uid, now);
          const u = await tx.economyUser.findUnique({
            where: { discordUserId: uid },
          });
          if (!u) throw new Error("NOUSER");
          const maxTier = BANK_TIER_UPGRADE_COSTS.length;
          if (u.bankTier >= maxTier) {
            throw new Error("MAX");
          }
          const cost = BANK_TIER_UPGRADE_COSTS[u.bankTier]!;
          if (u.cash < cost) throw new Error("POOR");
          const nextTier = u.bankTier + 1;
          const cashAfter = u.cash - cost;
          await tx.economyUser.update({
            where: { discordUserId: uid },
            data: { cash: cashAfter, bankTier: nextTier },
          });
          await tx.economyLedger.create({
            data: {
              discordUserId: uid,
              delta: -cost,
              balanceAfter: cashAfter,
              reason: "bank" satisfies LedgerReason,
              meta: { op: "tier_upgrade", tier: nextTier },
            },
          });
          return { cashAfter, tier: nextTier, cost, rebirthCount: u.rebirthCount };
        });

        const cap = effectiveBankCapForUser({
          bankTier: res.tier,
          rebirthCount: res.rebirthCount,
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: `${ecoM.bank} Bank tier upgraded`,
              description:
                `Paid **${formatCash(res.cost)}** → tier **${res.tier + 1}** (cap **${formatCash(cap)}**).\n` +
                `Cash: **${formatCash(res.cashAfter)}**.`,
            }),
          ],
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "MAX") {
          await message.reply({
            embeds: [errorEmbed("You're already at the max bank tier.")],
          });
          return;
        }
        if (msg === "POOR") {
          await message.reply({
            embeds: [errorEmbed("Not enough cash for the next tier upgrade.")],
          });
          return;
        }
        throw e;
      }
      return;
    }

    const row = await prisma.$transaction(async (tx) => {
      await applyBankInterestIfAny(tx, uid, now);
      return tx.economyUser.findUnique({ where: { discordUserId: uid } });
    });
    if (!row) {
      await message.reply({ embeds: [errorEmbed("Could not load your wallet.")] });
      return;
    }

    const cap = effectiveBankCapForUser(row);
    const tierRows = BANK_CAP_BY_TIER.map((c, i) => {
      const label = `Tier **${i + 1}**`;
      const capStr = `cap **${formatCash(c)}**`;
      const up =
        i < BANK_TIER_UPGRADE_COSTS.length
          ? ` · upgrade **${formatCash(BANK_TIER_UPGRADE_COSTS[i]!)}**`
          : "";
      const you = i === row.bankTier ? " ← _you_" : "";
      return `${ecoM.bank} ${label} — ${capStr}${up}${you}`;
    }).join("\n");
    const dailyPct = (BANK_DAILY_INTEREST_BPS / 100).toFixed(2);
    await message.reply({
      embeds: [
        minimalEmbed({
          title: `${ecoM.bank} Arivix Cash — bank`,
          description:
            `**Wallet:** **${formatCash(row.cash)}**\n` +
            `**Bank:** **${formatCash(row.bankCash)}** / **${formatCash(cap)}** (tier **${row.bankTier + 1}**)\n` +
            (row.bankTier < BANK_TIER_UPGRADE_COSTS.length
              ? `Next upgrade: **\`.bank upgrade\`** — **${formatCash(BANK_TIER_UPGRADE_COSTS[row.bankTier]!)}**\n`
              : "_Max tier reached._\n") +
            `\n**Tiers & caps**\n${tierRows}\n\n` +
            `_Lazy interest ~**${dailyPct}%** / day on bank balance (pro-rated; capped by tier)._`,
        }),
      ],
    });
  },
};
