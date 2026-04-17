import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

function parseInviteCode(raw: string): string | null {
  const t = raw.trim();
  const fromUrl = /(?:discord\.gg\/|discordapp\.com\/invite\/)([a-z0-9-]+)/i.exec(
    t,
  );
  if (fromUrl) return fromUrl[1];
  if (/^[a-z0-9-]{2,32}$/i.test(t)) return t;
  return null;
}

export const inviteinfoCommand: ArivixCommand = {
  name: "inviteinfo",
  aliases: ["invite-code", "invinfo"],
  description: "Look up basic information for a Discord invite code or link",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and server info.",
    usage: ".inviteinfo <code | invite link>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const joined = args.join(" ").trim();
    if (!joined) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **.inviteinfo** `code` or `https://discord.gg/…`"),
        ],
      });
      return;
    }

    const code = parseInviteCode(joined);
    if (!code) {
      await message.reply({
        embeds: [errorEmbed("Could not parse a valid invite code from that input.")],
      });
      return;
    }

    try {
      const inv = await message.client.fetchInvite(code);
      const guild = inv.guild;
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("Invite information")
        .addFields(
          { name: "Code", value: `\`${inv.code}\``, inline: true },
          {
            name: "Server",
            value: guild?.name ?? "*Unknown*",
            inline: true,
          },
          {
            name: "Snapshot",
            value:
              inv.memberCount != null
                ? `**${inv.memberCount}** members · **${inv.presenceCount ?? "—"}** online`
                : "—",
            inline: true,
          },
          {
            name: "Channel",
            value: inv.channel?.name ? `#${inv.channel.name}` : "—",
            inline: true,
          },
          {
            name: "Inviter",
            value: inv.inviter?.tag ?? "—",
            inline: true,
          },
          {
            name: "Temporary",
            value: inv.temporary ? "Yes" : "No",
            inline: true,
          },
        );

      if (guild?.iconURL()) {
        embed.setThumbnail(guild.iconURL({ size: 256 }) ?? null);
      }

      await message.reply({ embeds: [embed] });
    } catch {
      await message.reply({
        embeds: [
          errorEmbed(
            "Invite invalid, expired, or unknown — double-check the code.",
          ),
        ],
      });
    }
  },
};
