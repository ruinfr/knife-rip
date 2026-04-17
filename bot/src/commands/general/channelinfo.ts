import { ChannelType, EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

function channelTypeLabel(type: ChannelType): string {
  switch (type) {
    case ChannelType.GuildText:
      return "Text";
    case ChannelType.GuildVoice:
      return "Voice";
    case ChannelType.GuildCategory:
      return "Category";
    case ChannelType.GuildAnnouncement:
      return "Announcement";
    case ChannelType.GuildStageVoice:
      return "Stage";
    case ChannelType.GuildForum:
      return "Forum";
    case ChannelType.PublicThread:
    case ChannelType.PrivateThread:
    case ChannelType.AnnouncementThread:
      return "Thread";
    case ChannelType.GuildMedia:
      return "Media";
    default:
      return String(type);
  }
}

export const channelinfoCommand: ArivixCommand = {
  name: "channelinfo",
  aliases: ["ci", "channel"],
  description: "Technical details about a channel",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server insight.",
    usage: ".channelinfo [#channel | ID]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.channelinfo** in a server.")],
      });
      return;
    }

    let ch =
      message.mentions.channels.first() ??
      (args[0]
        ? guild.channels.cache.get(args[0].replace(/[^0-9]/g, ""))
        : null) ??
      (message.channel.isThread()
        ? message.channel.parent
        : message.channel);

    if (!ch || !("guild" in ch) || ch.guildId !== guild.id) {
      await message.reply({
        embeds: [errorEmbed("Could not resolve a channel in this server.")],
      });
      return;
    }

    const displayName =
      "name" in ch && typeof ch.name === "string" ? ch.name : ch.id;

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`${ch.isThread() ? "Thread" : "#"}${displayName}`)
      .addFields(
        { name: "ID", value: `\`${ch.id}\``, inline: true },
        {
          name: "Type",
          value: channelTypeLabel(ch.type),
          inline: true,
        },
      );

    if (ch.createdTimestamp != null) {
      const created = Math.floor(ch.createdTimestamp / 1000);
      embed.addFields({
        name: "Created",
        value: `<t:${created}:f> (<t:${created}:R>)`,
        inline: true,
      });
    }

    if ("topic" in ch && ch.topic) {
      embed.addFields({
        name: "Topic",
        value: ch.topic.slice(0, 1024),
        inline: false,
      });
    }
    if ("nsfw" in ch) {
      embed.addFields({ name: "NSFW", value: ch.nsfw ? "Yes" : "No", inline: true });
    }
    if ("rateLimitPerUser" in ch && ch.rateLimitPerUser != null) {
      embed.addFields({
        name: "Slowmode",
        value: `${ch.rateLimitPerUser}s`,
        inline: true,
      });
    }
    if ("bitrate" in ch && ch.bitrate != null) {
      embed.addFields({
        name: "Bitrate",
        value: `${ch.bitrate / 1000} kbps`,
        inline: true,
      });
    }
    if ("parent" in ch && ch.parent) {
      embed.addFields({
        name: "Parent",
        value: ch.parent.name,
        inline: true,
      });
    }

    if ("position" in ch && typeof ch.position === "number") {
      embed.setFooter({ text: `Position ${ch.position}` });
    }

    await message.reply({ embeds: [embed] });
  },
};
