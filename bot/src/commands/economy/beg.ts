import { randomInt } from "crypto";
import { ecoM } from "../../lib/economy/custom-emojis";
import {
  BEG_COOLDOWN_MS,
  BEG_MAX,
  BEG_MIN,
  BEG_MISS_CHANCE,
} from "../../lib/economy/economy-tuning";
import { rebirthBoostEarn } from "../../lib/economy/rebirth-income";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { formatCash } from "../../lib/economy/money";
import type { LedgerReason } from "../../lib/economy/wallet";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

export const begCommand: ArivixCommand = {
  name: "beg",
  aliases: ["panhandle", "sparechange"],
  description: "Beg for a tiny Arivix Cash tip (short cooldown, often nothing)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".beg · .panhandle · .sparechange",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.beg`** in a **server text channel** (not DMs)."),
        ],
      });
      return;
    }

    const uid = message.author.id;
    const prisma = getBotPrisma();
    const now = Date.now();
    const member =
      message.member ??
      (message.guild
        ? await message.guild.members.fetch(uid).catch(() => null)
        : null);

    try {
      const { newCash, got } = await prisma.$transaction(async (tx) => {
        const u = await tx.economyUser.upsert({
          where: { discordUserId: uid },
          create: { discordUserId: uid },
          update: {},
        });
        if (u.lastBegAt) {
          const elapsed = now - u.lastBegAt.getTime();
          if (elapsed < BEG_COOLDOWN_MS) {
            throw new Error(
              `COOLDOWN:${u.lastBegAt.getTime() + BEG_COOLDOWN_MS}`,
            );
          }
        }

        const miss = Math.random() < BEG_MISS_CHANCE;
        const raw = miss
          ? 0n
          : BigInt(randomInt(Number(BEG_MIN), Number(BEG_MAX) + 1));
        const delta = raw > 0n ? rebirthBoostEarn(u, member, raw) : 0n;
        const next = u.cash + delta;

        await tx.economyUser.update({
          where: { discordUserId: uid },
          data: { cash: next, lastBegAt: new Date(now) },
        });
        if (delta > 0n) {
          await tx.economyLedger.create({
            data: {
              discordUserId: uid,
              delta,
              balanceAfter: next,
              reason: "beg" satisfies LedgerReason,
            },
          });
        }
        return { newCash: next, got: delta };
      });

      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.cash} Arivix Cash — beg`,
            description:
              got > 0n
                ? `Someone dropped **${formatCash(got)}**. Balance: **${formatCash(newCash)}**.`
                : `Nobody stopped. Balance: **${formatCash(newCash)}**.`,
          }),
        ],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith("COOLDOWN:")) {
        const nextAt = Math.floor(Number(msg.split(":")[1]!) / 1000);
        await message.reply({
          embeds: [
            errorEmbed(
              `Wait before begging again — <t:${nextAt}:R> (<t:${nextAt}:f>).`,
            ),
          ],
        });
        return;
      }
      throw e;
    }
  },
};
