import { randomInt } from "crypto";
import { ecoM } from "../../lib/economy/custom-emojis";
import {
  CRIME_COOLDOWN_MS,
  CRIME_FAIL_FINE_TO_TREASURY_MAX,
  CRIME_FAIL_FINE_TO_TREASURY_MIN,
  CRIME_LOSS_MAX,
  CRIME_LOSS_MIN,
  CRIME_WIN_CHANCE,
  CRIME_WIN_MAX,
  CRIME_WIN_MIN,
} from "../../lib/economy/economy-tuning";
import { rebirthBoostEarn } from "../../lib/economy/rebirth-income";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { formatCash } from "../../lib/economy/money";
import {
  creditTreasuryInTx,
  type LedgerReason,
} from "../../lib/economy/wallet";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const crimeCommand: KnifeCommand = {
  name: "crime",
  aliases: ["heist", "lawless"],
  description: "Risky Arivix Cash job — negative EV; fines go to the treasury on failure",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".crime · .heist",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.crime`** in a **server text channel** (not DMs)."),
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
      const outcome = await prisma.$transaction(async (tx) => {
        const u = await tx.economyUser.upsert({
          where: { discordUserId: uid },
          create: { discordUserId: uid },
          update: {},
        });
        if (u.lastCrimeAt) {
          const elapsed = now - u.lastCrimeAt.getTime();
          if (elapsed < CRIME_COOLDOWN_MS) {
            throw new Error(
              `COOLDOWN:${u.lastCrimeAt.getTime() + CRIME_COOLDOWN_MS}`,
            );
          }
        }

        const win = Math.random() < CRIME_WIN_CHANCE;
        let delta = 0n;
        let summary = "";

        if (win) {
          const gain = BigInt(
            randomInt(Number(CRIME_WIN_MIN), Number(CRIME_WIN_MAX) + 1),
          );
          delta = rebirthBoostEarn(u, member, gain);
          summary = `You got away with **${formatCash(delta)}**.`;
        } else {
          const loss = BigInt(
            randomInt(Number(CRIME_LOSS_MIN), Number(CRIME_LOSS_MAX) + 1),
          );
          const fine = BigInt(
            randomInt(
              Number(CRIME_FAIL_FINE_TO_TREASURY_MIN),
              Number(CRIME_FAIL_FINE_TO_TREASURY_MAX) + 1,
            ),
          );
          delta = -(loss + fine);
          summary =
            `Caught — **${formatCash(loss)}** gone plus a **${formatCash(fine)}** fine to the treasury.`;
          const nextAfter = u.cash + delta;
          if (nextAfter < 0n) {
            throw new Error("BROKE");
          }
          await creditTreasuryInTx(tx, {
            delta: fine,
            reason: "treasury_fee",
            meta: { kind: "crime_fine", userId: uid },
            actorUserId: uid,
          });
        }

        const next = u.cash + delta;
        if (next < 0n) throw new Error("BROKE");

        await tx.economyUser.update({
          where: { discordUserId: uid },
          data: { cash: next, lastCrimeAt: new Date(now) },
        });
        await tx.economyLedger.create({
          data: {
            discordUserId: uid,
            delta,
            balanceAfter: next,
            reason: "crime" satisfies LedgerReason,
            meta: { win },
          },
        });
        return { next, summary };
      });

      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.cash} Arivix Cash — crime`,
            description: `${outcome.summary}\nBalance: **${formatCash(outcome.next)}**.`,
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
              `Heat is too high. Try again <t:${nextAt}:R> (<t:${nextAt}:f>).`,
            ),
          ],
        });
        return;
      }
      if (msg === "BROKE") {
        await message.reply({
          embeds: [
            errorEmbed(
              "You can't afford that loss right now — earn some cash first.",
            ),
          ],
        });
        return;
      }
      throw e;
    }
  },
};
