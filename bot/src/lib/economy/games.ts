import { randomInt } from "crypto";
import type { Client, GuildMember } from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { resolvePayoutMultiplierDetails } from "./payout-multiplier";
import { applyGambleOutcomeInTx } from "./gamble-outcome";
import { ecoM } from "./custom-emojis";
import { formatCash, formatGambleNetLine } from "./money";

/** American wheel reds on 1–36 (standard layout). */
export const ROULETTE_RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type HouseGameKind = "coinflip" | "dice" | "slots" | "roulette";

export type RoulettePick = "red" | "black" | "green";

/** Pocket label after a spin: `0`, `00`, or `1`…`36`. */
export function americanRoulettePocketLabel(idx: number): string {
  if (idx === 0) return "0";
  if (idx === 1) return "00";
  return String(idx - 1);
}

/** Uniform spin: index 0..37 (38 pockets). */
export function spinAmericanRouletteIndex(): number {
  return randomInt(38);
}

export function roulettePocketColor(
  pocketLabel: string,
): "green" | "red" | "black" {
  if (pocketLabel === "0" || pocketLabel === "00") return "green";
  const n = parseInt(pocketLabel, 10);
  if (!Number.isFinite(n) || n < 1 || n > 36) return "black";
  return ROULETTE_RED_NUMBERS.has(n) ? "red" : "black";
}

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

function petPayoutNote(petBonusAdd: number, payout: bigint): string {
  if (payout <= 0n || petBonusAdd <= 0) return "";
  return `_+\`${(petBonusAdd * 100).toFixed(1)}%\` from your equipped pet applied to this payout._\n`;
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
  /** Required when `game === "roulette"`. */
  roulettePick?: RoulettePick;
}): Promise<{ summary: string; net: bigint; won: boolean }> {
  const { userId, game, bet, member, client, roulettePick } = params;
  if (bet <= 0n) throw new Error("BAD_BET");
  if (game === "roulette") {
    if (
      !roulettePick ||
      (roulettePick !== "red" &&
        roulettePick !== "black" &&
        roulettePick !== "green")
    ) {
      throw new Error("BAD_PICK");
    }
  }

  const { mult, petBonusAdd } = await resolvePayoutMultiplierDetails({
    userId,
    member,
    client,
  });
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

    if (game === "roulette") {
      const pick = roulettePick!;
      const idx = spinAmericanRouletteIndex();
      const pocketLabel = americanRoulettePocketLabel(idx);
      const ballColor = roulettePocketColor(pocketLabel);
      const ballEmoji =
        ballColor === "green" ? "🟩" : ballColor === "red" ? "🟥" : "⬛";

      let win = false;
      if (pick === "green") win = ballColor === "green";
      else if (pick === "red") win = ballColor === "red";
      else win = ballColor === "black";

      if (pick === "green" && win) {
        payout = (bet * 19n * mc) / 100n;
      } else if ((pick === "red" || pick === "black") && win) {
        payout = (bet * 2n * mc) / 100n;
      } else {
        payout = 0n;
      }

      const pickLabel =
        pick === "red" ? "Red 🟥" : pick === "black" ? "Black ⬛" : "Green 🟩";
      const net = payout - bet;
      summary =
        `${ecoM.roulette} **Roulette** (American) — you bet **${pickLabel}**\n` +
        `Ball **${pocketLabel}** ${ballEmoji}\n` +
        (win
          ? `You **won**! Returned **${formatCash(payout)}** total.\n${petPayoutNote(petBonusAdd, payout)}${formatGambleNetLine(net)}`
          : `You **lost**.\n${formatGambleNetLine(net)}`);
    } else if (game === "coinflip") {
      const win = Math.random() < 0.5;
      payout = win ? (bet * 2n * mc) / 100n : 0n;
      const net = payout - bet;
      summary = win
        ? `${ecoM.coinflip} **Coinflip** — you **won**! Returned **${formatCash(payout)}** total.\n${petPayoutNote(petBonusAdd, payout)}${formatGambleNetLine(net)}`
        : `${ecoM.coinflip} **Coinflip** — you **lost**.\n${formatGambleNetLine(net)}`;
    } else if (game === "dice") {
      const you = 1 + Math.floor(Math.random() * 6);
      const house = 1 + Math.floor(Math.random() * 6);
      if (you > house) {
        payout = (bet * 2n * mc) / 100n;
        summary = `${ecoM.dice} You **${you}** vs house **${house}** — you **win**! Returned **${formatCash(payout)}** total.\n${petPayoutNote(petBonusAdd, payout)}${formatGambleNetLine(payout - bet)}`;
      } else if (you < house) {
        payout = 0n;
        summary = `${ecoM.dice} You **${you}** vs house **${house}** — house wins.\n${formatGambleNetLine(-bet)}`;
      } else {
        payout = bet;
        summary = `${ecoM.dice} Tie **${you}**–**${house}** — **push** (stake returned).\n${formatGambleNetLine(0n)}`;
      }
    } else {
      const [a, b, c] = rollSlots();
      const line = `${a} │ ${b} │ ${c}`;
      if (a === b && b === c) {
        payout = (bet * 5n * mc) / 100n;
        summary = `${ecoM.slots} ${line}\n**Triple** — returned **${formatCash(payout)}** total.\n${petPayoutNote(petBonusAdd, payout)}${formatGambleNetLine(payout - bet)}`;
      } else if (a === b || b === c || a === c) {
        payout = (bet * 3n * mc) / 200n;
        if (payout < 1n) payout = 1n;
        summary = `${ecoM.slots} ${line}\n**Pair** — returned **${formatCash(payout)}** total.\n${petPayoutNote(petBonusAdd, payout)}${formatGambleNetLine(payout - bet)}`;
      } else {
        payout = 0n;
        summary = `${ecoM.slots} ${line}\nNo match — you lost **${formatCash(bet)}**.\n${formatGambleNetLine(-bet)}`;
      }
    }

    const gameLog = game === "roulette" ? "roulette" : game;
    const { net } = await applyGambleOutcomeInTx(tx, row, {
      userId,
      bet,
      payout,
      game: gameLog,
    });

    const won = payout > bet;
    return { summary, net, won };
  });
}
