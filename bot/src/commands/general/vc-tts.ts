import {
  ChannelType,
  PermissionFlagsBits,
  type GuildTextBasedChannel,
  type GuildMember,
  type Message,
} from "discord.js";
import { PREFIX } from "../../config";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import {
  getTtsBindChannel,
  setTtsBindChannel,
} from "../../lib/vc-tts/binding-store";
import {
  joinVoiceForTts,
  leaveVoiceTts,
} from "../../lib/vc-tts/voice-player";
import type { KnifeCommand } from "../types";

function canConfigureTts(member: GuildMember): boolean {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.ManageChannels)
  );
}

function resolveBindTarget(
  message: Message,
  args: string[],
): GuildTextBasedChannel | null {
  const mentioned = message.mentions.channels.first();
  if (mentioned && "send" in mentioned && mentioned.type !== ChannelType.GuildVoice) {
    return mentioned as GuildTextBasedChannel;
  }
  const raw = args[0]?.trim();
  if (raw && /^\d{17,20}$/.test(raw)) {
    const ch = message.guild?.channels.cache.get(raw);
    if (ch && "send" in ch && ch.type !== ChannelType.GuildVoice) {
      return ch as GuildTextBasedChannel;
    }
  }
  if (
    message.channel.type !== ChannelType.DM &&
    "send" in message.channel
  ) {
    return message.channel as GuildTextBasedChannel;
  }
  return null;
}

export const ttsSetupCommand: KnifeCommand = {
  name: "ttssetup",
  aliases: ["ttsbind", "vcttssetup"],
  description:
    "Bind a text channel — messages there are read in VC after .ttsjoin (mods only)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage:
      ".ttssetup #channel · .ttssetup (this channel) · .ttsbind · .vcttssetup",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    const member = message.member;
    if (!guild || !member) {
      await message.reply({
        embeds: [errorEmbed("Use **.ttssetup** in a server.")],
      });
      return;
    }

    if (!canConfigureTts(member)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "You need **Manage Channels**, **Manage Server**, or **Administrator**.",
          ),
        ],
      });
      return;
    }

    const target = resolveBindTarget(message, args);
    if (!target) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Couldn’t resolve a text channel. Use **.ttssetup** `#channel` or run it in the channel to bind.",
          ),
        ],
      });
      return;
    }

    setTtsBindChannel(guild.id, target.id);
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "VC TTS bound",
          description:
            `Messages in ${target} will be read aloud when I’m connected via **.ttsjoin**.\n` +
            `Prefix commands (starting with **${PREFIX}**) are not spoken.`,
        }),
      ],
    });
  },
};

export const ttsJoinCommand: KnifeCommand = {
  name: "ttsjoin",
  aliases: ["vcttsjoin", "vctts"],
  description:
    "Join your voice channel and listen to the bound text channel (run from that text channel)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage:
      ".ttsjoin (in bound text channel, while in voice) · .vctts · .vcttsjoin",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const guild = message.guild;
    const member = message.member;
    if (!guild || !member) {
      await message.reply({
        embeds: [errorEmbed("Use **.ttsjoin** in a server.")],
      });
      return;
    }

    const bound = getTtsBindChannel(guild.id);
    if (!bound) {
      await message.reply({
        embeds: [
          errorEmbed(
            "No text channel bound yet. A mod must run **.ttssetup** `#channel` first.",
          ),
        ],
      });
      return;
    }

    if (message.channel.id !== bound) {
      const ch = await guild.channels.fetch(bound).catch(() => null);
      const label =
        ch && "name" in ch ? `<#${bound}>` : `channel \`${bound}\``;
      await message.reply({
        embeds: [
          errorEmbed(
            `Run **.ttsjoin** from the bound text channel: ${label}.`,
          ),
        ],
      });
      return;
    }

    const voice = member.voice.channel;
    if (!voice) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Join a **voice channel** first, then run **.ttsjoin** here again.",
          ),
        ],
      });
      return;
    }

    const result = await joinVoiceForTts(guild, voice, member);
    if (!result.ok) {
      await message.reply({ embeds: [errorEmbed(result.error)] });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "VC TTS live",
          description:
            `Connected to **${voice.name}**. Chat in this channel — I’ll read messages aloud (not lines starting with **${PREFIX}**). Use **.ttsleave** to disconnect.`,
        }),
      ],
    });
  },
};

export const ttsLeaveCommand: KnifeCommand = {
  name: "ttsleave",
  aliases: ["vcttsleave", "ttsdisconnect"],
  description: "Disconnect the bot from voice (VC TTS)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".ttsleave · .vcttsleave · .ttsdisconnect",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.ttsleave** in a server.")],
      });
      return;
    }

    const gone = leaveVoiceTts(guild.id);
    if (!gone) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "VC TTS",
            description: "I wasn’t in a voice session in this server.",
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "VC TTS stopped",
          description:
            "Disconnected from voice. The text bind is still set — use **.ttsjoin** again to resume.",
        }),
      ],
    });
  },
};
