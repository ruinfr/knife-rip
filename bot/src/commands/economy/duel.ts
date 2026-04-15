import {
  buildDuelChallengeEmbed,
  buildDuelChallengeRows,
  DUEL_CHALLENGE_MS,
} from "../../lib/economy/duel-flow";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { formatCash, parsePositiveBigInt } from "../../lib/economy/money";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const duelCommand: KnifeCommand = {
  name: "duel",
  aliases: ["pvp", "challenge"],
  description:
    "Challenge someone to a Arivix Cash stake duel (guild only; opponent accepts with a button)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".duel @user <amount> · .pvp · .challenge",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.duel`** in a **server text channel** (not DMs)."),
        ],
      });
      return;
    }

    const opponent = message.mentions.users.first();
    if (!opponent || opponent.bot) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **`.duel @user <amount>`** (positive whole number)."),
        ],
      });
      return;
    }

    const stakeArg = args.find((a) => /^\d/.test(a));
    const stake = stakeArg ? parsePositiveBigInt(stakeArg.replace(/[,_\s]/g, "")) : null;
    if (!stake) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **`.duel @user <amount>`** (positive whole number)."),
        ],
      });
      return;
    }

    const challengerId = message.author.id;
    const opponentId = opponent.id;
    if (challengerId === opponentId) {
      await message.reply({
        embeds: [errorEmbed("Pick someone else to duel.")],
      });
      return;
    }

    const prisma = getBotPrisma();
    const guild = message.guild!;
    const expiresAt = new Date(Date.now() + DUEL_CHALLENGE_MS);

    const row = await prisma.economyDuel.create({
      data: {
        guildId: guild.id,
        channelId: message.channel.id,
        challengerDiscordId: challengerId,
        opponentDiscordId: opponentId,
        stake,
        expiresAt,
        status: "pending",
      },
    });

    const msg = await message.reply({
      content: `<@${challengerId}> <@${opponentId}>`,
      embeds: [
        buildDuelChallengeEmbed({
          challengerId,
          opponentId,
          stake,
          expiresAt,
        }),
      ],
      components: buildDuelChallengeRows({
        opponentId,
        duelId: row.id,
      }),
      allowedMentions: { users: [challengerId, opponentId] },
    });

    await prisma.economyDuel.update({
      where: { id: row.id },
      data: { messageId: msg.id },
    });

    await message.react("⚔️").catch(() => {});
  },
};
