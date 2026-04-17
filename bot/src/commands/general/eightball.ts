import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

/** Classic Magic 8-Ball style replies */
const REPLIES = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes — definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don’t count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
] as const;

const MAX_QUESTION = 400;

export const eightBallCommand: ArivixCommand = {
  name: "8ball",
  aliases: ["eightball", "magic8ball"],
  description: "Ask the Magic 8-Ball a question (or get a random answer)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".8ball · .eightball · .magic8ball [question]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const q = args.join(" ").trim();
    if (!q) {
      await message.reply({
        embeds: [
          errorEmbed("Ask something — e.g. **`.8ball` will it rain tomorrow?**"),
        ],
      });
      return;
    }

    const question = q.slice(0, MAX_QUESTION);
    const pick = REPLIES[Math.floor(Math.random() * REPLIES.length)]!;

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Magic 8-Ball",
          description:
            `**You:** ${question}\n\n` +
            `**8-Ball:** **${pick}**`,
        }),
      ],
    });
  },
};
