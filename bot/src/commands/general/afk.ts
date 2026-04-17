import { clearAfkEntry, setAfkEntry } from "../../lib/afk/store";
import { minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

const DEFAULT_REASON = "AFK";

export const afkCommand: ArivixCommand = {
  name: "afk",
  aliases: ["away", "brb"],
  description:
    "Set AFK with an optional reason (default “AFK”); auto-reply + welcome back when you return",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".afk [reason] · .afk clear",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guildId = message.guild?.id ?? null;
    const uid = message.author.id;

    const sub = args[0]?.toLowerCase();
    if (sub === "clear" || sub === "off") {
      const had = clearAfkEntry(guildId, uid);
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

    const reason =
      args.length === 0
        ? DEFAULT_REASON
        : args.join(" ").trim().slice(0, 200) || DEFAULT_REASON;

    setAfkEntry(guildId, uid, reason);
    const description =
      reason === DEFAULT_REASON && args.length === 0
        ? "I'll reply when someone pings you."
        : `**${reason}** — I'll reply when someone pings you.`;

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "AFK",
          description,
        }),
      ],
    });
  },
};
