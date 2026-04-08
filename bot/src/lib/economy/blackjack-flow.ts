import { randomBytes, randomInt } from "crypto";
import type { Client, GuildMember } from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { economyPayoutMultiplier } from "./boost";
import { ECON_INTERACTION_PREFIX } from "./config";
import { ecoBtn, ecoM } from "./custom-emojis";
import { applyGambleOutcomeInTx } from "./gamble-outcome";
import { multCents } from "./games";
import { formatCash, formatGambleNetLine } from "./money";

const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export type BCard = { rank: (typeof RANKS)[number] };

export type BlackjackSession = {
  userId: string;
  bet: bigint;
  player: BCard[];
  dealer: BCard[];
  phase: "player" | "done";
  createdAt: number;
};

export const blackjackSessions = new Map<string, BlackjackSession>();

const SESSION_TTL_MS = 20 * 60 * 1000;

function pruneBlackjackSessions(): void {
  const t = Date.now();
  for (const [k, s] of blackjackSessions) {
    if (t - s.createdAt > SESSION_TTL_MS) blackjackSessions.delete(k);
  }
}

export function blackjackBtnId(
  uid: string,
  token: string,
  act: "hit" | "stand",
): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:bj:${token}:${act}`;
}

function drawCard(): BCard {
  return { rank: RANKS[randomInt(RANKS.length)]! };
}

export function handValue(cards: BCard[]): number {
  let sum = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces++;
      sum += 11;
    } else if (c.rank === "10" || c.rank === "J" || c.rank === "Q" || c.rank === "K") {
      sum += 10;
    } else {
      sum += parseInt(c.rank, 10);
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

function rankEmoji(rank: BCard["rank"]): string {
  const M = ecoM;
  switch (rank) {
    case "A":
      return M.tablerplaycarda;
    case "2":
      return M.tablerplaycard2;
    case "3":
      return M.tablerplaycard3;
    case "4":
      return M.tablerplaycard4;
    case "5":
      return M.tablerplaycard5;
    case "6":
      return M.tablerplaycard6;
    case "7":
      return M.tablerplaycard7;
    case "8":
      return M.tablerplaycard8;
    case "9":
      return M.tablerplaycard9;
    case "10":
      return "`10`";
    case "J":
      return M.tablerplaycardj;
    case "Q":
      return M.tablerplaycardq;
    case "K":
      return M.tablerplaycardk;
    default:
      return "?";
  }
}

function formatHand(cards: BCard[]): string {
  return cards.map((c) => rankEmoji(c.rank)).join(" ");
}

function isNatural(cards: BCard[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

function playDealer(hole: BCard[]): BCard[] {
  const d = [...hole];
  while (handValue(d) < 17) {
    d.push(drawCard());
  }
  return d;
}

async function settleBlackjack(params: {
  userId: string;
  bet: bigint;
  payout: bigint;
  member: GuildMember | null;
}): Promise<void> {
  const { userId, bet, payout, member } = params;
  const prisma = getBotPrisma();
  await prisma.$transaction(async (tx) => {
    const row = await tx.economyUser.upsert({
      where: { discordUserId: userId },
      create: { discordUserId: userId },
      update: {},
    });
    if (row.cash < bet) throw new Error("INSUFFICIENT_FUNDS");
    await applyGambleOutcomeInTx(tx, row, {
      userId,
      bet,
      payout,
      game: "blackjack",
    });
  });
}

function buildBlackjackEmbed(params: {
  session: BlackjackSession;
  title: string;
  footer?: string;
  color?: number;
}): EmbedBuilder {
  const { session, title, footer, color } = params;
  const pVal = handValue(session.player);
  const dShown =
    session.phase === "player"
      ? `${formatHand([session.dealer[0]!])} 🂠`
      : `${formatHand(session.dealer)} (**${handValue(session.dealer)}**)`;

  const desc =
    `${ecoM.blackjack} **Your hand** (${pVal})\n${formatHand(session.player)}\n\n` +
    `**Dealer**\n${dShown}\n\n` +
    `**Bet:** **${formatCash(session.bet)}**`;

  const e = new EmbedBuilder()
    .setColor(color ?? 0x5865f2)
    .setTitle(title)
    .setDescription(desc);
  if (footer) e.setFooter({ text: footer });
  return e;
}

function playingRows(
  uid: string,
  token: string,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  return [
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(blackjackBtnId(uid, token, "hit"))
        .setLabel("Hit")
        .setStyle(ButtonStyle.Primary)
        .setEmoji(ecoBtn.icoutlineplus),
      new ButtonBuilder()
        .setCustomId(blackjackBtnId(uid, token, "stand"))
        .setLabel("Stand")
        .setStyle(ButtonStyle.Success)
        .setEmoji(ecoBtn.materialsymbolscheckbox),
    ),
  ];
}

export async function runBlackjackInitial(params: {
  userId: string;
  bet: bigint;
  member: GuildMember | null;
  client: Client;
}): Promise<{
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}> {
  pruneBlackjackSessions();
  const { userId, bet, member, client } = params;
  const mult = await economyPayoutMultiplier(member, userId, client);
  const mc = multCents(mult);

  const player = [drawCard(), drawCard()];
  const dealer = [drawCard(), drawCard()];

  const pNat = isNatural(player);
  const dNat = isNatural(dealer);

  if (pNat && dNat) {
    const payout = bet;
    await settleBlackjack({ userId, bet, payout, member });
    return {
      embeds: [
        buildBlackjackEmbed({
          session: {
            userId,
            bet,
            player,
            dealer,
            phase: "done",
            createdAt: Date.now(),
          },
          title: "Blackjack — push",
          footer: `Both natural 21 — stake returned · **${formatCash(payout)}** back\n${formatGambleNetLine(0n)}`,
          color: 0xf0b232,
        }),
      ],
      components: [],
    };
  }

  if (pNat && !dNat) {
    const payout = (bet * 250n * mc) / 10000n;
    await settleBlackjack({ userId, bet, payout, member });
    return {
      embeds: [
        buildBlackjackEmbed({
          session: {
            userId,
            bet,
            player,
            dealer,
            phase: "done",
            createdAt: Date.now(),
          },
          title: "Blackjack!",
          footer: `Natural 21 — returned **${formatCash(payout)}** total\n${formatGambleNetLine(payout - bet)}`,
          color: 0x57f287,
        }),
      ],
      components: [],
    };
  }

  if (!pNat && dNat) {
    await settleBlackjack({ userId, bet, payout: 0n, member });
    return {
      embeds: [
        buildBlackjackEmbed({
          session: {
            userId,
            bet,
            player,
            dealer,
            phase: "done",
            createdAt: Date.now(),
          },
          title: "Dealer blackjack",
          footer: `House wins.\n${formatGambleNetLine(-bet)}`,
          color: 0xed4245,
        }),
      ],
      components: [],
    };
  }

  const token = randomBytes(5).toString("hex");
  blackjackSessions.set(token, {
    userId,
    bet,
    player,
    dealer,
    phase: "player",
    createdAt: Date.now(),
  });

  const session = blackjackSessions.get(token)!;
  return {
    embeds: [
      buildBlackjackEmbed({
        session,
        title: `${ecoM.blackjack} Blackjack`,
        footer: "Hit or stand — closest to 21 without busting wins.",
      }),
    ],
    components: playingRows(userId, token),
  };
}

export async function handleBlackjackButton(params: {
  userId: string;
  token: string;
  action: "hit" | "stand";
  member: GuildMember | null;
  client: Client;
}): Promise<{
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}> {
  pruneBlackjackSessions();
  const { userId, token, action, member, client } = params;
  const session = blackjackSessions.get(token);
  if (!session || session.userId !== userId || session.phase !== "player") {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Hand expired")
          .setDescription("Start a new game from **`.gamble`**."),
      ],
      components: [],
    };
  }

  const mult = await economyPayoutMultiplier(member, userId, client);
  const mc = multCents(mult);
  const bet = session.bet;

  if (action === "hit") {
    session.player.push(drawCard());
    const pv = handValue(session.player);
    if (pv > 21) {
      blackjackSessions.delete(token);
      await settleBlackjack({ userId, bet, payout: 0n, member });
      return {
        embeds: [
          buildBlackjackEmbed({
            session: { ...session, phase: "done", dealer: session.dealer },
            title: "Bust",
            footer: `**${pv}** — bust.\n${formatGambleNetLine(-bet)}`,
            color: 0xed4245,
          }),
        ],
        components: [],
      };
    }
    return {
      embeds: [
        buildBlackjackEmbed({
          session,
          title: `${ecoM.blackjack} Blackjack`,
          footer: "Hit or stand.",
        }),
      ],
      components: playingRows(userId, token),
    };
  }

  /* stand */
  session.dealer = playDealer(session.dealer);
  session.phase = "done";
  blackjackSessions.delete(token);

  const dv = handValue(session.dealer);
  const pv = handValue(session.player);
  let payout = 0n;
  let title = "";
  let footer = "";
  let color = 0x5865f2;

  if (dv > 21) {
    payout = (bet * 2n * mc) / 100n;
    title = "Dealer busts — you win";
    footer = `Returned **${formatCash(payout)}** total\n${formatGambleNetLine(payout - bet)}`;
    color = 0x57f287;
  } else if (pv > dv) {
    payout = (bet * 2n * mc) / 100n;
    title = "You win";
    footer = `**${pv}** vs **${dv}** — returned **${formatCash(payout)}** total\n${formatGambleNetLine(payout - bet)}`;
    color = 0x57f287;
  } else if (pv < dv) {
    payout = 0n;
    title = "House wins";
    footer = `**${pv}** vs **${dv}**.\n${formatGambleNetLine(-bet)}`;
    color = 0xed4245;
  } else {
    payout = bet;
    title = "Push";
    footer = `**${pv}** — stake returned.\n${formatGambleNetLine(0n)}`;
    color = 0xf0b232;
  }

  await settleBlackjack({ userId, bet, payout, member });

  return {
    embeds: [
      buildBlackjackEmbed({
        session,
        title,
        footer,
        color,
      }),
    ],
    components: [],
  };
}
