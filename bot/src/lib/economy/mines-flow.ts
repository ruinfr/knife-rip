import { randomBytes, randomInt } from "crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Client,
  type Guild,
  type GuildMember,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { resolvePayoutMultiplier } from "./payout-multiplier";
import { ECON_INTERACTION_PREFIX } from "./config";
import { ecoBtn, ecoM } from "./custom-emojis";
import { applyGambleOutcomeInTx } from "./gamble-outcome";
import { boostGambleWinPayout } from "./rebirth-mult";
import { multCents } from "./games";
import { formatCash, formatGambleNetLine } from "./money";

/** 4×4 grid */
export const MINES_TOTAL = 16;
export const MINES_COUNT = 5;

export type MinesSession = {
  userId: string;
  bet: bigint;
  mines: Set<number>;
  revealed: Set<number>;
  dead: boolean;
  createdAt: number;
};

export const minesSessions = new Map<string, MinesSession>();

const SESSION_TTL_MS = 20 * 60 * 1000;

function pruneMinesSessions(): void {
  const t = Date.now();
  for (const [k, s] of minesSessions) {
    if (t - s.createdAt > SESSION_TTL_MS) minesSessions.delete(k);
  }
}

export function minesPickId(uid: string, token: string, idx: number): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:mn:${token}:p:${idx}`;
}

export function minesCashId(uid: string, token: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:mn:${token}:cash`;
}

function payoutBps(gems: number): number {
  return 10000 + gems * 1400 + gems * gems * 80;
}

function placeMines(): Set<number> {
  const s = new Set<number>();
  while (s.size < MINES_COUNT) {
    s.add(randomInt(MINES_TOTAL));
  }
  return s;
}

async function settleMinesRound(params: {
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
    let pay = payout;
    if (payout > bet) {
      pay = boostGambleWinPayout(bet, payout, row, member);
    }
    await applyGambleOutcomeInTx(tx, row, {
      userId,
      bet,
      payout: pay,
      game: "mines",
    });
  });
}

function buildMinesEmbed(
  session: MinesSession,
  opts: { title: string; subtitle?: string; color?: number },
): EmbedBuilder {
  const gems = session.revealed.size;
  const bps = gems > 0 ? payoutBps(gems) : 10000;
  const mult = gems > 0 ? (bps / 10000).toFixed(2) : "—";

  const desc =
    `${ecoM.mines} **Mines** — **${MINES_COUNT}** bombs, **${MINES_TOTAL - MINES_COUNT}** safe tiles.\n\n` +
    `**Bet:** **${formatCash(session.bet)}**\n` +
    `**Gems found:** **${gems}**\n` +
    `**Cash-out multiplier:** ${gems > 0 ? `**×${mult}**` : "_Pick a tile to start._"}\n\n` +
    (opts.subtitle ?? "");

  return new EmbedBuilder()
    .setColor(opts.color ?? 0x5865f2)
    .setTitle(opts.title)
    .setDescription(desc);
}

function minesComponents(
  uid: string,
  token: string,
  session: MinesSession,
  revealAll: boolean,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
  for (let r = 0; r < 4; r++) {
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
    for (let c = 0; c < 4; c++) {
      const idx = r * 4 + c;
      const isMine = session.mines.has(idx);
      const isRev = session.revealed.has(idx);
      const dead = session.dead;

      const btn = new ButtonBuilder().setCustomId(minesPickId(uid, token, idx));

      if (revealAll || (dead && isMine)) {
        btn.setDisabled(true);
        btn.setStyle(isMine ? ButtonStyle.Danger : ButtonStyle.Success);
        btn.setEmoji(isMine ? ecoBtn.emojionev1bomb : ecoBtn.emojionev1gemstone);
        btn.setLabel("\u200b");
      } else if (isRev) {
        btn.setDisabled(true);
        btn.setStyle(ButtonStyle.Success);
        btn.setEmoji(ecoBtn.emojionev1gemstone);
        btn.setLabel("\u200b");
      } else {
        btn.setStyle(ButtonStyle.Secondary);
        btn.setEmoji(ecoBtn.MinesTile);
        btn.setLabel("\u200b");
        if (dead) btn.setDisabled(true);
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }

  const cash = new ButtonBuilder()
    .setCustomId(minesCashId(uid, token))
    .setLabel("Cash out")
    .setStyle(ButtonStyle.Primary)
    .setEmoji(ecoBtn.wallet);

  if (session.dead || revealAll || session.revealed.size === 0) {
    cash.setDisabled(true);
  }

  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(cash),
  );
  return rows;
}

export async function runMinesInitial(params: {
  userId: string;
  bet: bigint;
  member: GuildMember | null;
}): Promise<{
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}> {
  pruneMinesSessions();
  const { userId, bet } = params;
  const token = randomBytes(5).toString("hex");
  minesSessions.set(token, {
    userId,
    bet,
    mines: placeMines(),
    revealed: new Set(),
    dead: false,
    createdAt: Date.now(),
  });
  const s = minesSessions.get(token)!;
  return {
    embeds: [
      buildMinesEmbed(s, {
        title: `${ecoM.mines} Mines`,
        subtitle: "Tap a tile. **Gem** = safe (raises multiplier). **Bomb** = lose the bet.",
      }),
    ],
    components: minesComponents(userId, token, s, false),
  };
}

export type MinesUiResult = {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
  /** Bet settled or round ended — outcome message may auto-delete. */
  roundFinished: boolean;
};

export async function handleMinesPick(params: {
  userId: string;
  token: string;
  idx: number;
  /** Used only when the board clears (payout multiplier). Skips a fetch on bomb / mid-round gems. */
  guild: Guild | null;
  client: Client;
}): Promise<MinesUiResult> {
  pruneMinesSessions();
  const { userId, token, idx, guild, client } = params;
  const session = minesSessions.get(token);
  if (!session || session.userId !== userId || session.dead) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Round expired")
          .setDescription("Open **`.gamble`** to play again."),
      ],
      components: [],
      roundFinished: true,
    };
  }
  if (session.revealed.has(idx) || idx < 0 || idx >= MINES_TOTAL) {
    return {
      embeds: [
        buildMinesEmbed(session, {
          title: `${ecoM.mines} Mines`,
          subtitle: "Pick a hidden tile.",
        }),
      ],
      components: minesComponents(userId, token, session, false),
      roundFinished: false,
    };
  }

  const bet = session.bet;

  if (session.mines.has(idx)) {
    session.dead = true;
    session.revealed.add(idx);
    minesSessions.delete(token);
    await settleMinesRound({ userId, bet, payout: 0n, member: null });
    return {
      embeds: [
        buildMinesEmbed(session, {
          title: "💥 Mine!",
          subtitle: `You hit a bomb — stake **${formatCash(bet)}** lost.\n${formatGambleNetLine(-bet)}`,
          color: 0xed4245,
        }),
      ],
      components: minesComponents(userId, token, session, true),
      roundFinished: true,
    };
  }

  session.revealed.add(idx);
  const gems = session.revealed.size;
  const safeLeft = MINES_TOTAL - MINES_COUNT - gems;
  if (safeLeft <= 0) {
    const member =
      (await guild?.members.fetch(userId).catch(() => null)) ?? null;
    const mult = await resolvePayoutMultiplier({ userId, member, client });
    const mc = multCents(mult);
    const bps = BigInt(payoutBps(gems));
    const payout = (bet * bps * mc) / 1_000_000n;
    minesSessions.delete(token);
    await settleMinesRound({ userId, bet, payout, member });
    return {
      embeds: [
        buildMinesEmbed(session, {
          title: "Board cleared!",
          subtitle: `Returned **${formatCash(payout)}** total — every safe tile found.\n${formatGambleNetLine(payout - bet)}`,
          color: 0x57f287,
        }),
      ],
      components: minesComponents(userId, token, session, true),
      roundFinished: true,
    };
  }

  return {
    embeds: [
      buildMinesEmbed(session, {
        title: `${ecoM.mines} Mines`,
        subtitle: "Keep going or **Cash out**.",
      }),
    ],
    components: minesComponents(userId, token, session, false),
    roundFinished: false,
  };
}

export async function handleMinesCash(params: {
  userId: string;
  token: string;
  member: GuildMember | null;
  client: Client;
}): Promise<MinesUiResult> {
  pruneMinesSessions();
  const { userId, token, member, client } = params;
  const session = minesSessions.get(token);
  if (!session || session.userId !== userId || session.dead) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Round expired")
          .setDescription("Open **`.gamble`** to play again."),
      ],
      components: [],
      roundFinished: true,
    };
  }
  const gems = session.revealed.size;
  if (gems < 1) {
    return {
      embeds: [
        buildMinesEmbed(session, {
          title: `${ecoM.mines} Mines`,
          subtitle: "Reveal **at least one** gem before cashing out.",
        }),
      ],
      components: minesComponents(userId, token, session, false),
      roundFinished: false,
    };
  }

  const mult = await resolvePayoutMultiplier({ userId, member, client });
  const mc = multCents(mult);
  const bet = session.bet;
  const bps = BigInt(payoutBps(gems));
  const payout = (bet * bps * mc) / 1_000_000n;

  session.dead = true;
  minesSessions.delete(token);
  await settleMinesRound({ userId, bet, payout, member });

  return {
    embeds: [
      buildMinesEmbed(session, {
        title: "Cashed out",
        subtitle: `**${gems}** gems — returned **${formatCash(payout)}** total.\n${formatGambleNetLine(payout - bet)}`,
        color: 0x57f287,
      }),
    ],
    components: minesComponents(userId, token, session, true),
    roundFinished: true,
  };
}
