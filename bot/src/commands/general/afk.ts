import {
  clearAfkState,
  setAfkState,
} from "../../lib/afk";
import { minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const afkCommand: KnifeCommand = {
  name: "afk",
  description: "Set an AFK note; auto-reply when you're mentioned",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".afk [note] · .afk clear",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guildId = message.guild?.id ?? null;
    const uid = message.author.id;

    const sub = args[0]?.toLowerCase();
    if (args.length === 0 || sub === "clear" || sub === "off") {
      const had = clearAfkState(guildId, uid);
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "AFK",
            description: had
              ? "You're no longer marked AFK."
              : "You weren't AFK.",
          }),
        ],
      });
      return;
    }

    const note = args.join(" ").trim();
    if (!note) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "AFK",
            description:
              "Add a short note, e.g. `.afk eating`, or use `.afk clear`.",
          }),
        ],
      });
      return;
    }

    setAfkState(guildId, uid, note);
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "AFK",
          description: `You're now AFK — **${note}**. I'll mention it when someone pings you.`,
        }),
      ],
    });
  },
};
