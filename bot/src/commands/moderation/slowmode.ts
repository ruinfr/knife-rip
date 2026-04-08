import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import {
  actionableErrorEmbed,
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import type { KnifeCommand } from "../types";

const MAX_SLOWMODE_SECONDS = 21_600; // 6 hours (Discord cap)

async function requireManageChannels(message: Message) {
  const g = message.guild;
  if (!g) return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return missingPermissionEmbed("you", "Manage Channels");
  }
  return null;
}

type ChannelWithSlowmode = {
  setRateLimitPerUser: (sec: number, reason?: string) => Promise<unknown>;
};

function channelSupportsSlowmode(
  ch: Message["channel"],
): ch is Message["channel"] & ChannelWithSlowmode {
  return (
    ch.isTextBased() &&
    !ch.isDMBased() &&
    typeof (ch as { setRateLimitPerUser?: unknown }).setRateLimitPerUser ===
      "function"
  );
}

export const slowmodeCommand: KnifeCommand = {
  name: "slowmode",
  aliases: ["slow", "ratelimit"],
  description: "Set this channel’s slowmode (0–21600 seconds; 0 turns it off)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".slowmode [seconds]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageChannels(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const raw = args[0]?.trim();
    if (raw === undefined || raw === "") {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **`.slowmode`** `seconds` — e.g. `0` off, `5`, `60` (max 21600)."),
        ],
      });
      return;
    }

    const sec = parseInt(raw, 10);
    if (!Number.isFinite(sec) || sec < 0 || sec > MAX_SLOWMODE_SECONDS) {
      await message.reply({
        embeds: [
          errorEmbed(
            `Seconds must be between **0** and **${MAX_SLOWMODE_SECONDS}** (Discord limit).`,
          ),
        ],
      });
      return;
    }

    const ch = message.channel;
    if (!channelSupportsSlowmode(ch)) {
      await message.reply({
        embeds: [errorEmbed("Slowmode isn’t available in this channel type.")],
      });
      return;
    }

    const me = message.guild!.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply({
        embeds: [missingPermissionEmbed("bot", "Manage Channels")],
      });
      return;
    }

    try {
      await ch.setRateLimitPerUser(
        sec,
        `slowmode ${sec}s — ${message.author.tag}`,
      );
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Slowmode failed",
            body: "Discord rejected the change — I need **Manage Channels** here and a role position that can edit this channel.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Slowmode updated",
          description:
            sec === 0
              ? "**Slowmode** is **off** for this channel."
              : `**Slowmode:** **${sec}** second${sec === 1 ? "" : "s"} between messages.`,
        }),
      ],
    });
  },
};
