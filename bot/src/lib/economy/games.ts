import type { GuildMember } from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { economyPayoutMultiplier } from "./boost";
import { formatCash } from "./money";

export type HouseGameKind = "coinflip" | "dice" | "slots";

const SLOT_SYM = ["🍒", "🍋", "🍇", "⭐", "💎", "7️⃣"] as const;

function rollSlots(): [string, string, string] {
  return [
    SLOT_SYM[Math.floor(Math.random() * SLOT_SYM.length)]!,
    SLOT_SYM[Math.floor(Math.random() * SLOT_SYM.length)]!,
    SLOT_SYM[Math.floor(Math.random() * SLOT_SYM.length)]!,
  ];
}

function multCents(mult: number): bigint {
  return BigInt(Math.round(mult * 100));
}

/**
 * Play a house game: deducts bet, credits payout, logs row. Throws INSUFFICIENT_FUNDS.
 */
export async function runHouseGame(params: {
  userId: string;
  game: HouseGameKind;
  bet: bigint;
  member: GuildMember | null;
}): Promise<{ summary: string; net: bigint; won: boolean }> {
  const { userId, game, bet, member } = params;
  if (bet <= 0n) throw new Error("BAD_BET");

  const mult = await economyPayoutMultiplier(member, userId);
  const mc = multCents(mult);
  const prisma = getBotPrisma();

  return prisma.$transaction(async (tx) => {
    const row = await tx.economyUser.upsert({
      where: { discordUserId: userId },
      create: { discordUserId: userId },
      update: {},
    });
    if (row.cash < bet) throw new Error("INSUFFICIENT_FUNDS");

    let payout = 0n;
    let summary = "";

    if (game === "coinflip") {
      const win = Math.random() < 0.5;
      payout = win ? (bet * 2n * mc) / 100n : 0n;
      summary = win
        ? `🪙 **Coinflip** — you **won**! Payout **${formatCash(payout)}** cash.`
        : `🪙 **Coinflip** — you **lost** this round.`;
    } else if (game === "dice") {
      const you = 1 + Math.floor(Math.random() * 6);
      const house = 1 + Math.floor(Math.random() * 6);
      if (you > house) {
        payout = (bet * 2n * mc) / 100n;
        summary = `🎲 You **${you}** vs house **${house}** — you **win** **${formatCash(payout)}**!`;
      } else if (you < house) {
        payout = 0n;
        summary = `🎲 You **${you}** vs house **${house}** — house wins.`;
      } else {
        payout = bet;
        summary = `🎲 Tie **${you}**–**${house}** — **push** (refunded).`;
      }
    } else {
      const [a, b, c] = rollSlots();
      const line = `${a} │ ${b} │ ${c}`;
      if (a === b && b === c) {
        payout = (bet * 5n * mc) / 100n;
        summary = `🎰 ${line}\n**Triple** — **${formatCash(payout)}**!`;
      } else if (a === b || b === c || a === c) {
        payout = (bet * 3n * mc) / 200n;
        if (payout < 1n) payout = 1n;
        summary = `🎰 ${line}\n**Pair** — **${formatCash(payout)}**!`;
      } else {
        payout = 0n;
        summary = `🎰 ${line}\nNo luck — try again!`;
      }
    }

    const net = payout - bet;
    const newCash = row.cash - bet + payout;

    const winInc = payout > bet ? 1 : 0;
    const lossInc = payout === 0n ? 1 : 0;
    const newStreak =
      payout > bet
        ? row.gambleWinStreak + 1
        : payout === bet
          ? row.gambleWinStreak
          : 0;
    const best = Math.max(row.gambleBestStreak, newStreak);

    await tx.economyUser.update({
      where: { discordUserId: userId },
      data: {
        cash: newCash,
        gambleWins: { increment: winInc },
        gambleLosses: { increment: lossInc },
        gambleNetProfit: { increment: net },
        gambleWinStreak: newStreak,
        gambleBestStreak: best,
      },
    });

    await tx.economyLedger.create({
      data: {
        discordUserId: userId,
        delta: net,
        balanceAfter: newCash,
        reason: "gamble",
        meta: { game, bet: bet.toString(), payout: payout.toString() },
      },
    });

    await tx.economyGambleLog.create({
      data: {
        discordUserId: userId,
        game,
        bet,
        payout,
        won: winInc > 0,
      },
    });

    return { summary, net, won: payout > bet };
  });
}
