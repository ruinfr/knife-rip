import { EmbedBuilder } from "discord.js";
import {
  boostTierLabel,
  channelBreakdown,
  designAssetLink,
  maxEmojiSlots,
  ts,
  verificationLabel,
} from "../../lib/discord-info-format";
import { errorEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

const EMBED_COLOR = 0x2b2d31;

export const serverinfoCommand: KnifeCommand = {
  name: "serverinfo",
  aliases: ["si"],
  description: "Detailed server stats (Bleed-style layout)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".serverinfo · .si",
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

    const client = message.client;
    await guild.fetch();

    try {
      if (guild.memberCount < 5000) {
        await guild.members.fetch().catch(() => {});
      }
    } catch {
      /* ignore */
    }

    const owner = await guild.fetchOwner().catch(() => null);
    const ownerTag = owner
      ? owner.user.globalName ?? owner.user.username
      : `\`${guild.ownerId}\``;

    let humans = 0;
    let bots = 0;
    let boosters = 0;
    for (const m of guild.members.cache.values()) {
      if (m.user.bot) bots += 1;
      else humans += 1;
      if (m.premiumSince) boosters += 1;
    }
    const totalMembers = guild.memberCount ?? guild.members.cache.size;
    const cacheComplete =
      guild.memberCount != null &&
      guild.members.cache.size === guild.memberCount;
    const memberLine = cacheComplete
      ? `**Total:** ${totalMembers.toLocaleString()}\n**Humans:** ${humans.toLocaleString()}\n**Bots:** ${bots.toLocaleString()}`
      : `**Total:** ${totalMembers.toLocaleString()}\n*Humans/bots split needs a full member cache (auto-fetched under 5k members).*`;

    const { text, voice, category, total: chTotal } = channelBreakdown(guild);
    const rolesUsed = Math.max(0, guild.roles.cache.size - 1);
    const emojiUsed = guild.emojis.cache.size;
    const emojiMax = maxEmojiSlots(guild.premiumTier);
    const boosts = guild.premiumSubscriptionCount ?? 0;
    const boostTier = boostTierLabel(guild.premiumTier);

    const icon = guild.iconURL({ size: 512, extension: "png", forceStatic: false });
    const splash = guild.splashURL({ size: 4096 });
    const banner = guild.bannerURL({ size: 4096 });

    const shardTotal = client.shard?.count ?? 1;
    const shardId = guild.shardId ?? 0;

    const createdSec = Math.floor(guild.createdTimestamp / 1000);
    const desc =
      `Server created on ${ts(createdSec, "D")} (${ts(createdSec, "R")})\n` +
      `**${guild.name}** is on bot shard ID: **${shardId}/${shardTotal}**`;

    const design =
      `${designAssetLink("Splash", splash)} · ${designAssetLink("Banner", banner)} · ${designAssetLink("Icon", icon)}`;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setAuthor({
        name: message.author.globalName ?? message.author.username,
        iconURL: message.author.displayAvatarURL({ size: 128 }),
      })
      .setTitle(guild.name)
      .setDescription(desc)
      .setThumbnail(icon)
      .addFields(
        { name: "Owner", value: ownerTag, inline: true },
        { name: "Members", value: memberLine, inline: true },
        {
          name: "Information",
          value:
            `**Verification:** ${verificationLabel(guild.verificationLevel)}\n` +
            `**Boosts:** ${boosts.toLocaleString()} (${boostTier})`,
          inline: true,
        },
        { name: "Design", value: design, inline: true },
        {
          name: `Channels (${chTotal})`,
          value:
            `**Text:** ${text}\n**Voice:** ${voice}\n**Category:** ${category}`,
          inline: true,
        },
        {
          name: "Counts",
          value:
            `**Roles:** ${rolesUsed}/250\n` +
            `**Emojis:** ${emojiUsed}/${emojiMax}\n` +
            `**Boosters:** ${boosters.toLocaleString()}`,
          inline: true,
        },
      )
      .setFooter({ text: `Guild ID: ${guild.id}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
