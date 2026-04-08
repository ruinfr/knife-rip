import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  EmbedBuilder,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { ECON_INTERACTION_PREFIX } from "./config";
import { ecoBtn, ecoM } from "./custom-emojis";
import { scheduleGambleOutcomeDeletion } from "./gamble-result-cleanup";
import { economyLogEmbed, sendEconomyLog } from "./log";
import { formatCash, formatGambleNetLine } from "./money";
import type { SettleCoinflipPvpResult } from "./coinflip-pvp-settle";
import { settleCoinflipPvpChallenge } from "./coinflip-pvp-settle";

/** Time opponent has to accept before the challenge expires (lazy cleanup on click). */
export const COINFLIP_PVP_CHALLENGE_MS = 300_000;

const HUB_COLOR = 0x57f287;

function challengeButtonCustomIds(params: {
  opponentId: string;
  challengeId: string;
}): { accept: string; decline: string } {
  const { opponentId, challengeId } = params;
  return {
    accept: `${ECON_INTERACTION_PREFIX}${opponentId}:cfpvp:${challengeId}:a`,
    decline: `${ECON_INTERACTION_PREFIX}${opponentId}:cfpvp:${challengeId}:d`,
  };
}

export function buildCoinflipPvpChallengeEmbed(params: {
  challengerId: string;
  opponentId: string;
  bet: bigint;
  expiresAt: Date;
}): EmbedBuilder {
  const { challengerId, opponentId, bet, expiresAt } = params;
  const rel = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 60_000));
  return new EmbedBuilder()
    .setColor(HUB_COLOR)
    .setTitle(`${ecoM.coinflippvp} Coinflip PVP`)
    .setDescription(
      `<@${challengerId}> challenges <@${opponentId}> for **${formatCash(bet)}** each.\n\n` +
        `**${ecoM.coinflip}** Fair **50/50** — **Heads** = challenger wins, **Tails** = opponent wins.\n\n` +
        `_Only <@${opponentId}> can **Accept** or **Decline**._\n` +
        `_Expires in ~**${rel}** min._`,
    );
}

export function buildCoinflipPvpChallengeRows(params: {
  opponentId: string;
  challengeId: string;
}): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const ids = challengeButtonCustomIds(params);
  return [
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ids.accept)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success)
        .setEmoji(ecoBtn.Confirm),
      new ButtonBuilder()
        .setCustomId(ids.decline)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger)
        .setEmoji(ecoBtn.Cancel),
    ),
  ];
}

export function buildCoinflipPvpOutcomeEmbed(
  result: SettleCoinflipPvpResult,
): EmbedBuilder {
  const { headsChallengerWins, winnerId, loserId, bet } = result;
  const side = headsChallengerWins ? "**Heads**" : "**Tails**";
  const winNet = bet;
  const loseNet = -bet;
  return new EmbedBuilder()
    .setColor(0xf0b232)
    .setTitle(`${ecoM.coinflippvp} Coinflip PVP — settled`)
    .setDescription(
      `${side} — <@${winnerId}> wins **${formatCash(bet)}** from the pot.\n\n` +
        `<@${winnerId}>: ${formatGambleNetLine(winNet)}\n` +
        `<@${loserId}>: ${formatGambleNetLine(loseNet)}`,
    );
}

export function buildCoinflipPvpDeclinedEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle(`${ecoM.Cancel} Coinflip PVP declined`)
    .setDescription("The opponent declined — no cash was moved.");
}

export function buildCoinflipPvpExpiredEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x99aab5)
    .setTitle(`${ecoM.tablerinfosquarefilled} Coinflip PVP expired`)
    .setDescription("No one accepted in time — no cash was moved.");
}

/**
 * Mark pending challenge expired if past `expiresAt`; returns current row or null.
 */
export async function expireCoinflipPvpIfStale(challengeId: string) {
  const prisma = getBotPrisma();
  const ch = await prisma.economyCoinflipPvpChallenge.findUnique({
    where: { id: challengeId },
  });
  if (!ch || ch.status !== "pending") return ch;
  if (ch.expiresAt.getTime() >= Date.now()) return ch;
  return prisma.economyCoinflipPvpChallenge.update({
    where: { id: challengeId },
    data: { status: "expired" },
  });
}

/** Call after `deferUpdate` on the button interaction. */
export async function handleCoinflipPvpDecline(params: {
  interaction: ButtonInteraction;
  challengeId: string;
  opponentId: string;
}): Promise<void> {
  const { interaction, challengeId, opponentId } = params;
  const prisma = getBotPrisma();
  const ch = await prisma.economyCoinflipPvpChallenge.findUnique({
    where: { id: challengeId },
  });
  if (!ch) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ That challenge no longer exists.",
    });
    return;
  }
  if (ch.opponentDiscordId !== opponentId) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ Wrong challenge.",
    });
    return;
  }
  if (ch.status === "declined") {
    return;
  }
  if (ch.status !== "pending") {
    await interaction.followUp({
      ephemeral: true,
      content:
        ch.status === "completed"
          ? "This challenge is already finished."
          : "This challenge is no longer open.",
    });
    return;
  }

  await prisma.economyCoinflipPvpChallenge.update({
    where: { id: challengeId },
    data: { status: "declined" },
  });

  await interaction.message.edit({
    embeds: [buildCoinflipPvpDeclinedEmbed()],
    components: [],
  });
}

/** Call after `deferUpdate` on the button interaction. */
export async function handleCoinflipPvpAccept(params: {
  interaction: ButtonInteraction;
  challengeId: string;
  opponentId: string;
}): Promise<void> {
  const { interaction, challengeId, opponentId } = params;
  const prisma = getBotPrisma();
  const guild = interaction.guild;
  if (!guild) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ Use this in a server.",
    });
    return;
  }

  let ch = await prisma.economyCoinflipPvpChallenge.findUnique({
    where: { id: challengeId },
  });
  if (!ch) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ That challenge no longer exists.",
    });
    return;
  }
  if (ch.guildId !== guild.id) {
    await interaction.followUp({ ephemeral: true, content: "❌ Wrong server." });
    return;
  }
  if (ch.opponentDiscordId !== opponentId) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ Wrong challenge.",
    });
    return;
  }
  if (ch.status === "completed") {
    await interaction.followUp({
      ephemeral: true,
      content: "This challenge is already finished.",
    });
    return;
  }
  if (ch.status !== "pending") {
    await interaction.followUp({
      ephemeral: true,
      content: "This challenge is no longer open.",
    });
    return;
  }

  ch = await expireCoinflipPvpIfStale(challengeId);
  if (!ch || ch.status === "expired") {
    await interaction.message.edit({
      embeds: [buildCoinflipPvpExpiredEmbed()],
      components: [],
    });
    await interaction.followUp({
      ephemeral: true,
      content: "⏰ That challenge expired.",
    });
    return;
  }

  const challengerMem = await guild.members
    .fetch(ch.challengerDiscordId)
    .catch(() => null);
  const opponentMem = await guild.members
    .fetch(ch.opponentDiscordId)
    .catch(() => null);
  if (!challengerMem || !opponentMem) {
    await interaction.followUp({
      ephemeral: true,
      content:
        "❌ Both players must be in this server to settle. (Someone may have left.)",
    });
    return;
  }

  let result: SettleCoinflipPvpResult;
  try {
    result = await settleCoinflipPvpChallenge(challengeId);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "NOT_PENDING" || code === "NOT_FOUND") {
      await interaction.followUp({
        ephemeral: true,
        content: "This challenge is no longer pending.",
      });
      return;
    }
    if (code === "EXPIRED") {
      await interaction.message.edit({
        embeds: [buildCoinflipPvpExpiredEmbed()],
        components: [],
      });
      await interaction.followUp({
        ephemeral: true,
        content: "⏰ That challenge expired.",
      });
      return;
    }
    if (
      code === "INSUFFICIENT_CHALLENGER" ||
      code === "INSUFFICIENT_OPPONENT"
    ) {
      await prisma.economyCoinflipPvpChallenge.updateMany({
        where: { id: challengeId, status: "pending" },
        data: { status: "failed" },
      });
      await interaction.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("Coinflip PVP failed")
            .setDescription(
              code === "INSUFFICIENT_CHALLENGER"
                ? "The challenger no longer has enough cash."
                : "You no longer have enough cash to cover the bet.",
            ),
        ],
        components: [],
      });
      await interaction.followUp({
        ephemeral: true,
        content:
          code === "INSUFFICIENT_OPPONENT"
            ? "❌ You don’t have enough cash."
            : "❌ Challenger doesn’t have enough cash.",
      });
      return;
    }
    await interaction.followUp({
      ephemeral: true,
      content: "❌ Could not settle — try again or start a new challenge.",
    });
    return;
  }

  const embed = buildCoinflipPvpOutcomeEmbed(result);
  const msg = await interaction.message.edit({
    content: `<@${result.challengerId}> <@${result.opponentId}>`,
    embeds: [embed],
    components: [],
    allowedMentions: {
      users: [result.challengerId, result.opponentId],
    },
  });
  scheduleGambleOutcomeDeletion(msg);
  void sendEconomyLog(
    interaction.client,
    economyLogEmbed(
      `${ecoM.coinflippvp} PVP coinflip`,
      `<@${result.challengerId}> vs <@${result.opponentId}> · **${formatCash(result.bet)}** each · **winner:** <@${result.winnerId}> (${result.headsChallengerWins ? "Heads" : "Tails"}).`,
    ),
  );
}
