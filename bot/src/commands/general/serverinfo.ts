import { ChannelType } from "discord.js";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

function discordTimestamp(ms: number): string {
  return `<t:${Math.floor(ms / 1000)}:F>`;
}

export const serverinfoCommand: KnifeCommand = {
  name: "serverinfo",
  aliases: ["si"],
  description: "Show stats for the current server",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".serverinfo",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [
          errorEmbed("Use **.serverinfo** in a server, not in DMs."),
        ],
      });
      return;
    }

    await guild.fetch();
    const owner = await guild.fetchOwner().catch(() => null);
    const ownerLine = owner
      ? `${owner.user.globalName ?? owner.user.username} (\`${owner.user.id}\`)`
      : `\`${guild.ownerId}\``;

    const text = guild.channels.cache.filter((c) => c.isTextBased()).size;
    const voice = guild.channels.cache.filter((c) => c.isVoiceBased()).size;
    const categories = guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildCategory,
    ).size;

    const lines = [
      `**Name:** ${guild.name}`,
      `**ID:** \`${guild.id}\``,
      `**Owner:** ${ownerLine}`,
      `**Created:** ${discordTimestamp(guild.createdTimestamp)}`,
      `**Members:** ${guild.memberCount?.toLocaleString() ?? "—"}`,
      `**Channels:** ${text} text · ${voice} voice · ${categories} categories`,
      `**Boost tier:** ${guild.premiumTier} · **boosts:** ${guild.premiumSubscriptionCount ?? 0}`,
      `**Verification:** ${guild.verificationLevel}`,
    ];

    const iconUrl = guild.iconURL({
      size: 512,
      extension: "png",
      forceStatic: false,
    });

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Server — ${guild.name}`,
          description: lines.join("\n"),
          ...(iconUrl ? { imageUrl: iconUrl } : {}),
        }),
      ],
    });
  },
};
