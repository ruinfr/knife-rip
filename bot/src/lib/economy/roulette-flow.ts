import { randomBytes } from "crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import { ECON_INTERACTION_PREFIX } from "./config";
import { ecoM } from "./custom-emojis";
import { formatCash } from "./money";

export type RouletteSession = {
  userId: string;
  bet: bigint;
  createdAt: number;
};

export const rouletteSessions = new Map<string, RouletteSession>();

export const ROULETTE_SESSION_TTL_MS = 5 * 60 * 1000;

export function pruneRouletteSessions(): void {
  const t = Date.now();
  for (const [k, s] of rouletteSessions) {
    if (t - s.createdAt > ROULETTE_SESSION_TTL_MS) rouletteSessions.delete(k);
  }
}

export function newRouletteToken(): string {
  return randomBytes(5).toString("hex");
}

/** `ke:<uid>:rl:<token>:r|b|g` */
export function roulettePickCustomId(
  uid: string,
  token: string,
  pick: "r" | "b" | "g",
): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:rl:${token}:${pick}`;
}

export function roulettePickLetterToChoice(
  letter: string,
): "red" | "black" | "green" | null {
  if (letter === "r") return "red";
  if (letter === "b") return "black";
  if (letter === "g") return "green";
  return null;
}

const ROULETTE_COLOR = 0xf0b232;

export function buildRoulettePickEmbed(bet: bigint): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(ROULETTE_COLOR)
    .setTitle(`${ecoM.roulette} Roulette`)
    .setDescription(
      `${ecoM.roulette} **American** wheel — **0**, **00**, and **1–36**.\n\n` +
        `**Bet:** **${formatCash(bet)}**\n\n` +
        `**Red 🟥** or **Black ⬛** — even money (**2×** return if you win).\n` +
        `**Green 🟩** — wins on **0** or **00** (**19×** return).\n\n` +
        `_Pick a color below._`,
    );
}

export function buildRoulettePickRows(params: {
  userId: string;
  token: string;
}): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const { userId, token } = params;
  return [
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(roulettePickCustomId(userId, token, "r"))
        .setLabel("Red")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🟥"),
      new ButtonBuilder()
        .setCustomId(roulettePickCustomId(userId, token, "b"))
        .setLabel("Black")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⬛"),
      new ButtonBuilder()
        .setCustomId(roulettePickCustomId(userId, token, "g"))
        .setLabel("Green")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🟩"),
    ),
  ];
}
