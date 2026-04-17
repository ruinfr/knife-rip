import { ecoM } from "../../lib/economy/custom-emojis";
import { tryFulfillBountyOnRobSuccess } from "../../lib/economy/bounty-fulfill";
import {
  ROB_ATTEMPT_FEE,
  ROB_COOLDOWN_MS,
  ROB_MIN_VICTIM_CASH,
  ROB_STEAL_CAP,
  ROB_STEAL_PCT_BPS,
  ROB_SUCCESS_TREASURY_FEE_PCT,
  ROB_VICTIM_ALT_FLOOR_CASH,
  ROB_VICTIM_MIN_LIFETIME_MSGS,
  ROB_WIN_CHANCE,
  VICTIM_DAILY_ROB_CAP,
  VICTIM_ROB_COOLDOWN_MS,
} from "../../lib/economy/economy-tuning";
import { rebirthBoostEarn } from "../../lib/economy/rebirth-income";
import { effectiveRobWinChance } from "../../lib/economy/rebirth-mult";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { formatCash } from "../../lib/economy/money";
import {
  creditTreasuryInTx,
  type LedgerReason,
} from "../../lib/economy/wallet";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const robCommand: ArivixCommand = {
  name: "rob",
  aliases: ["steal", "mug"],
  description: "Try to steal Arivix Cash from another member (guild only, high fail rate)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".rob @user · .steal · .mug",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.rob`** in a **server text channel** (not DMs)."),
        ],
      });
      return;
    }

    const victimUser = message.mentions.users.first();
    if (!victimUser || victimUser.bot) {
      await message.reply({
        embeds: [
          errorEmbed("Mention a user to rob: **`.rob @user`**."),
        ],
      });
      return;
    }

    const robberId = message.author.id;
    const victimId = victimUser.id;
    if (robberId === victimId) {
      await message.reply({
        embeds: [errorEmbed("You can't rob yourself.")],
      });
      return;
    }

    const guildId = message.guild!.id;
    const prisma = getBotPrisma();
    const now = Date.now();
    const today = utcYmd(new Date(now));
    const member =
      message.member ??
      (await message.guild!.members.fetch(robberId).catch(() => null));

    try {
      const out = await prisma.$transaction(async (tx) => {
        const robber = await tx.economyUser.upsert({
          where: { discordUserId: robberId },
          create: { discordUserId: robberId },
          update: {},
        });
        const victim = await tx.economyUser.upsert({
          where: { discordUserId: victimId },
          create: { discordUserId: victimId },
          update: {},
        });

        if (robber.lastRobAt) {
          const w = now - robber.lastRobAt.getTime();
          if (w < ROB_COOLDOWN_MS) {
            throw new Error(`RCD:${robber.lastRobAt.getTime() + ROB_COOLDOWN_MS}`);
          }
        }
        if (robber.cash < ROB_ATTEMPT_FEE) {
          throw new Error("FEE");
        }

        if (victim.cash < ROB_MIN_VICTIM_CASH) {
          throw new Error("VPOOR");
        }
        const victimOk =
          victim.lifetimeMessages >= ROB_VICTIM_MIN_LIFETIME_MSGS ||
          victim.cash >= ROB_VICTIM_ALT_FLOOR_CASH;
        if (!victimOk) {
          throw new Error("VFLOOR");
        }

        if (victim.lastRobbedAt) {
          const w = now - victim.lastRobbedAt.getTime();
          if (w < VICTIM_ROB_COOLDOWN_MS) {
            throw new Error(
              `VCD:${victim.lastRobbedAt.getTime() + VICTIM_ROB_COOLDOWN_MS}`,
            );
          }
        }

        let vCount = victim.robVictimCount;
        let vDay = victim.robVictimDay;
        if (vDay !== today) {
          vCount = 0;
          vDay = today;
        }
        if (vCount >= VICTIM_DAILY_ROB_CAP) {
          throw new Error("VCAP");
        }

        const robberCashAfterFee = robber.cash - ROB_ATTEMPT_FEE;
        await tx.economyUser.update({
          where: { discordUserId: robberId },
          data: {
            cash: robberCashAfterFee,
            lastRobAt: new Date(now),
          },
        });
        await tx.economyLedger.create({
          data: {
            discordUserId: robberId,
            delta: -ROB_ATTEMPT_FEE,
            balanceAfter: robberCashAfterFee,
            reason: "rob" satisfies LedgerReason,
            meta: { kind: "attempt_fee", victim: victimId },
          },
        });
        await creditTreasuryInTx(tx, {
          delta: ROB_ATTEMPT_FEE,
          reason: "treasury_fee",
          meta: { kind: "rob_attempt", robber: robberId, victim: victimId },
          actorUserId: robberId,
        });

        const win =
          Math.random() < effectiveRobWinChance(ROB_WIN_CHANCE, robber);
        if (!win) {
          return {
            ok: false as const,
            robberCash: robberCashAfterFee,
            summary: `You got caught — **${formatCash(ROB_ATTEMPT_FEE)}** went to the treasury.`,
          };
        }

        const rawSteal = (victim.cash * BigInt(ROB_STEAL_PCT_BPS)) / 10000n;
        const steal =
          rawSteal > ROB_STEAL_CAP ? ROB_STEAL_CAP : rawSteal;
        if (steal <= 0n) {
          return {
            ok: false as const,
            robberCash: robberCashAfterFee,
            summary: "Nothing worth taking.",
          };
        }

        const successFee =
          (steal * BigInt(ROB_SUCCESS_TREASURY_FEE_PCT) + 99n) / 100n;
        const robberGain = rebirthBoostEarn(
          robber,
          member,
          steal - successFee,
        );
        const victimAfter = victim.cash - steal;
        if (victimAfter < 0n) throw new Error("VPOOR");

        const robberFinal = robberCashAfterFee + robberGain;
        await tx.economyUser.update({
          where: { discordUserId: victimId },
          data: {
            cash: victimAfter,
            lastRobbedAt: new Date(now),
            robVictimCount: vCount + 1,
            robVictimDay: today,
          },
        });
        await tx.economyUser.update({
          where: { discordUserId: robberId },
          data: { cash: robberFinal },
        });

        await tx.economyLedger.create({
          data: {
            discordUserId: victimId,
            delta: -steal,
            balanceAfter: victimAfter,
            reason: "rob" satisfies LedgerReason,
            meta: { from: robberId },
          },
        });
        await tx.economyLedger.create({
          data: {
            discordUserId: robberId,
            delta: robberGain,
            balanceAfter: robberFinal,
            reason: "rob" satisfies LedgerReason,
            meta: { victim: victimId, steal: steal.toString() },
          },
        });
        if (successFee > 0n) {
          await creditTreasuryInTx(tx, {
            delta: successFee,
            reason: "treasury_fee",
            meta: { kind: "rob_success", robber: robberId, victim: victimId },
            actorUserId: robberId,
          });
        }

        const bounty = await tryFulfillBountyOnRobSuccess(tx, {
          guildId,
          robberId,
          targetId: victimId,
        });

        return {
          ok: true as const,
          robberCash: robberFinal,
          summary:
            `You stole **${formatCash(robberGain)}** (treasury took **${formatCash(successFee)}** of the pull).\n` +
            (bounty
              ? `${ecoM.cash} Open bounty paid **${formatCash(bounty.paid)}**!`
              : ""),
        };
      });

      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.cash} Robbery`,
            description: `${out.summary}\nYour balance: **${formatCash(out.robberCash)}**.`,
          }),
        ],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith("RCD:")) {
        const t = Math.floor(Number(msg.split(":")[1]!) / 1000);
        await message.reply({
          embeds: [
            errorEmbed(`You're cooling off — try <t:${t}:R>.`),
          ],
        });
        return;
      }
      if (msg.startsWith("VCD:")) {
        const t = Math.floor(Number(msg.split(":")[1]!) / 1000);
        await message.reply({
          embeds: [
            errorEmbed(`That user was robbed recently — try <t:${t}:R>.`),
          ],
        });
        return;
      }
      if (msg === "FEE") {
        await message.reply({
          embeds: [
            errorEmbed(
              `You need **${formatCash(ROB_ATTEMPT_FEE)}** for the attempt fee.`,
            ),
          ],
        });
        return;
      }
      if (msg === "VPOOR") {
        await message.reply({
          embeds: [
            errorEmbed(
              `Victim needs at least **${formatCash(ROB_MIN_VICTIM_CASH)}** cash.`,
            ),
          ],
        });
        return;
      }
      if (msg === "VFLOOR") {
        await message.reply({
          embeds: [
            errorEmbed(
              [
                "That user is **too new** to rob as a target.",
                "",
                "They count as established only if **either**:",
                `• **≥ ${ROB_VICTIM_MIN_LIFETIME_MSGS.toLocaleString()}** lifetime messages tracked in Arivix Cash, **or**`,
                `• **≥ ${formatCash(ROB_VICTIM_ALT_FLOOR_CASH)}** cash on hand.`,
                "",
                `(They must still have at least **${formatCash(ROB_MIN_VICTIM_CASH)}** cash to be robbable at all.)`,
              ].join("\n"),
              { title: "Rob — target too new" },
            ),
          ],
        });
        return;
      }
      if (msg === "VCAP") {
        await message.reply({
          embeds: [
            errorEmbed("That user has been hit enough today — pick another target."),
          ],
        });
        return;
      }
      throw e;
    }
  },
};
