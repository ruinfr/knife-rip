import type { Message } from "discord.js";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import type { KnifeCommand } from "../types";

function wantsVersusFlip(message: Message, args: string[]): boolean {
  if (message.mentions.users.size > 0) return true;
  const raw = args[0]?.trim();
  return !!(raw && /^\d{17,20}$/.test(raw));
}

export const coinflipCommand: KnifeCommand = {
  name: "coinflip",
  aliases: ["flip", "cf"],
  description: "Flip a coin — Heads or Tails, or challenge someone",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".coinflip · .coinflip @user",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!wantsVersusFlip(message, args)) {
      const heads = Math.random() < 0.5;
      const label = heads ? "Heads" : "Tails";
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `🪙 ${label}`,
            description: `You got **${label}**.`,
          }),
        ],
      });
      return;
    }

    const opponent = await resolveTargetUser(message, args);
    if (opponent.id === message.author.id) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Pick someone else — you can’t flip a coin against yourself.",
          ),
        ],
      });
      return;
    }

    const authorWins = Math.random() < 0.5;
    const winner = authorWins ? message.author : opponent;

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "🪙 Coinflip",
          description: `<@${message.author.id}> **vs** <@${opponent.id}>\n\n**Winner:** <@${winner.id}>`,
        }),
      ],
    });
  },
};
