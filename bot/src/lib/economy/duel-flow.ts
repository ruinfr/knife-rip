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
import { DUEL_EXPIRE_MS } from "./economy-tuning";
import { settleEconomyDuel } from "./duel-settle";
import { scheduleGambleOutcomeDeletion } from "./gamble-result-cleanup";
import { economyLogEmbed, sendEconomyLog } from "./log";
import { formatCash, formatGambleNetLine } from "./money";

const HUB_COLOR = 0x57f287;

function duelButtonIds(params: {
  opponentId: string;
  duelId: string;
}): { accept: string; decline: string } {
  const { opponentId, duelId } = params;
  return {
    accept: `${ECON_INTERACTION_PREFIX}${opponentId}:ecduel:${duelId}:a`,
    decline: `${ECON_INTERACTION_PREFIX}${opponentId}:ecduel:${duelId}:d`,
  };
}

export function buildDuelChallengeEmbed(params: {
  challengerId: string;
  opponentId: string;
  stake: bigint;
  expiresAt: Date;
}): EmbedBuilder {
  const { challengerId, opponentId, stake, expiresAt } = params;
  const rel = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / 60_000),
  );
  return new EmbedBuilder()
    .setColor(HUB_COLOR)
    .setTitle(`${ecoM.coinflippvp} Arivix Cash — duel`)
    .setDescription(
      `<@${challengerId}> duels <@${opponentId}> for **${formatCash(stake)}** each.\n\n` +
        `Winner takes the pot minus a **small house rake** to the treasury.\n\n` +
        `_Only <@${opponentId}> can **Accept** or **Decline**._\n` +
        `_Expires in ~**${rel}** min._`,
    );
}

export function buildDuelChallengeRows(params: {
  opponentId: string;
  duelId: string;
}): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const ids = duelButtonIds(params);
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

export { DUEL_EXPIRE_MS as DUEL_CHALLENGE_MS };

export async function expireDuelIfStale(duelId: string) {
  const prisma = getBotPrisma();
  const d = await prisma.economyDuel.findUnique({ where: { id: duelId } });
  if (!d || d.status !== "pending") return d;
  if (d.expiresAt.getTime() >= Date.now()) return d;
  return prisma.economyDuel.update({
    where: { id: duelId },
    data: { status: "expired" },
  });
}

export async function handleDuelDecline(params: {
  interaction: ButtonInteraction;
  duelId: string;
  opponentId: string;
}): Promise<void> {
  const { interaction, duelId, opponentId } = params;
  const prisma = getBotPrisma();
  const d = await prisma.economyDuel.findUnique({ where: { id: duelId } });
  if (!d || d.opponentDiscordId !== opponentId) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ That duel no longer exists.",
    });
    return;
  }
  if (d.status !== "pending") return;
  await prisma.economyDuel.update({
    where: { id: duelId },
    data: { status: "declined" },
  });
  await interaction.message.edit({
    embeds: [
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`${ecoM.Cancel} Duel declined`)
        .setDescription("No cash was moved."),
    ],
    components: [],
  });
}

export async function handleDuelAccept(params: {
  interaction: ButtonInteraction;
  duelId: string;
  opponentId: string;
}): Promise<void> {
  const { interaction, duelId, opponentId } = params;
  const prisma = getBotPrisma();
  const guild = interaction.guild;
  if (!guild) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ Use this in a server.",
    });
    return;
  }

  let d = await prisma.economyDuel.findUnique({ where: { id: duelId } });
  if (!d || d.opponentDiscordId !== opponentId) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ That duel no longer exists.",
    });
    return;
  }
  if (d.guildId !== guild.id) {
    await interaction.followUp({ ephemeral: true, content: "❌ Wrong server." });
    return;
  }
  if (d.status !== "pending") {
    await interaction.followUp({
      ephemeral: true,
      content: "This duel is no longer open.",
    });
    return;
  }

  d = await expireDuelIfStale(duelId);
  if (!d || d.status === "expired") {
    await interaction.message.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0x99aab5)
          .setTitle("Duel expired")
          .setDescription("No cash was moved."),
      ],
      components: [],
    });
    await interaction.followUp({ ephemeral: true, content: "⏰ Expired." });
    return;
  }

  const challengerMem = await guild.members
    .fetch(d.challengerDiscordId)
    .catch(() => null);
  const opponentMem = await guild.members
    .fetch(d.opponentDiscordId)
    .catch(() => null);
  if (!challengerMem || !opponentMem) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ Both players must still be in this server.",
    });
    return;
  }

  try {
    const result = await settleEconomyDuel(duelId);
    const winNet = result.stake - result.rake;
    const embed = new EmbedBuilder()
      .setColor(0xf0b232)
      .setTitle(`${ecoM.coinflippvp} Duel settled`)
      .setDescription(
        `<@${result.winnerId}> wins the pot.\n` +
          `Pot **${formatCash(result.stake * 2n)}** · Treasury rake **${formatCash(result.rake)}**.\n\n` +
          `<@${result.winnerId}>: ${formatGambleNetLine(winNet)}\n` +
          `<@${result.loserId}>: ${formatGambleNetLine(-result.stake)}`,
      );

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
        `${ecoM.coinflippvp} Duel`,
        `<@${result.challengerId}> vs <@${result.opponentId}> · stake **${formatCash(result.stake)}** · winner <@${result.winnerId}>.`,
      ),
    );
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "INSUFFICIENT_CHALLENGER" || code === "INSUFFICIENT_OPPONENT") {
      await prisma.economyDuel.updateMany({
        where: { id: duelId, status: "pending" },
        data: { status: "failed" },
      });
      await interaction.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("Duel failed")
            .setDescription(
              code === "INSUFFICIENT_OPPONENT"
                ? "You don't have enough cash."
                : "The challenger no longer has enough cash.",
            ),
        ],
        components: [],
      });
      await interaction.followUp({
        ephemeral: true,
        content:
          code === "INSUFFICIENT_OPPONENT"
            ? "❌ Insufficient cash."
            : "❌ Challenger broke.",
      });
      return;
    }
    await interaction.followUp({
      ephemeral: true,
      content: "❌ Could not settle.",
    });
  }
}
