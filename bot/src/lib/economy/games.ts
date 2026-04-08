import type { Client, GuildMember } from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { economyPayoutMultiplier } from "./boost";
import { applyGambleOutcomeInTx } from "./gamble-outcome";
import { ecoM } from "./custom-emojis";
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

export function multCents(mult: number): bigint {
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
  client: Client;
}): Promise<{ summary: string; net: bigint; won: boolean }> {
  const { userId, game, bet, member, client } = params;
  if (bet <= 0n) throw new Error("BAD_BET");

  const mult = await economyPayoutMultiplier(member, userId, client);
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
        ? `${ecoM.coinflip} **Coinflip** — you **won**! Payout **${formatCash(payout)}** cash.`
        : `${ecoM.coinflip} **Coinflip** — you **lost** this round.`;
    } else if (game === "dice") {
      const you = 1 + Math.floor(Math.random() * 6);
      const house = 1 + Math.floor(Math.random() * 6);
      if (you > house) {
        payout = (bet * 2n * mc) / 100n;
        summary = `${ecoM.dice} You **${you}** vs house **${house}** — you **win** **${formatCash(payout)}**!`;
      } else if (you < house) {
        payout = 0n;
        summary = `${ecoM.dice} You **${you}** vs house **${house}** — house wins.`;
      } else {
        payout = bet;
        summary = `${ecoM.dice} Tie **${you}**–**${house}** — **push** (refunded).`;
      }
    } else {
      const [a, b, c] = rollSlots();
      const line = `${a} │ ${b} │ ${c}`;
      if (a === b && b === c) {
        payout = (bet * 5n * mc) / 100n;
        summary = `${ecoM.slots} ${line}\n**Triple** — **${formatCash(payout)}**!`;
      } else if (a === b || b === c || a === c) {
        payout = (bet * 3n * mc) / 200n;
        if (payout < 1n) payout = 1n;
        summary = `${ecoM.slots} ${line}\n**Pair** — **${formatCash(payout)}**!`;
      } else {
        payout = 0n;
        summary = `${ecoM.slots} ${line}\nNo luck — try again!`;
      }
    }

    const { net } = await applyGambleOutcomeInTx(tx, row, {
      userId,
      bet,
      payout,
      game,
    });

    const won = payout > bet;
    return { summary, net, won };
  });
}
