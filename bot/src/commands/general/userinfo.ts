import { EmbedBuilder } from "discord.js";
import { ts, userBadgeEmojis } from "../../lib/discord-info-format";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import type { KnifeCommand } from "../types";

const EMBED_COLOR = 0x2b2d31;
const ROLE_FIELD_MAX = 1024;

function truncateRoleMentions(
  mentions: string[],
): { text: string; total: number } {
  const total = mentions.length;
  if (total === 0) return { text: "*No roles*", total: 0 };
  let out = "";
  let shown = 0;
  for (const m of mentions) {
    const piece = shown === 0 ? m : ` ${m}`;
    if (out.length + piece.length > ROLE_FIELD_MAX - 28) {
      const hidden = total - shown;
      return { text: `${out} … *+${hidden} more*`, total };
    }
    out += piece;
    shown += 1;
  }
  return { text: out, total };
}

export const userinfoCommand: KnifeCommand = {
  name: "userinfo",
  aliases: ["ui"],
  description: "Detailed user profile (sectioned layout)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".userinfo [@user | ID] · .ui",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const rawUser = await resolveTargetUser(message, args);
    const user = await rawUser.fetch().catch(() => rawUser);

    const guild = message.guild;
    let member = null;
    if (guild) {
      try {
        if (guild.memberCount != null && guild.memberCount < 5000) {
          await guild.members.fetch().catch(() => {});
        }
        member = await guild.members.fetch(user.id).catch(() => null);
      } catch {
        member = null;
      }
    }

    const display = user.globalName ?? user.username;
    const title = `${display} (${user.id})`;

    const badges = userBadgeEmojis(user);
    const descLines: string[] = [];
    if (badges) descLines.push(badges);
    if (member?.voice?.channel) {
      const ch = member.voice.channel;
      const others = Math.max(
        0,
        ch.members.filter((m) => m.id !== user.id).size,
      );
      descLines.push(
        `**In voice:** ${ch.name}${others > 0 ? ` with ${others} other${others === 1 ? "" : "s"}` : ""}`,
      );
    }
    const description = descLines.length > 0 ? descLines.join("\n") : "\u200b";

    const createdSec = Math.floor(user.createdTimestamp / 1000);
    let datesValue = `**Created:** ${ts(createdSec, "f")} (${ts(createdSec, "R")})`;
    if (member?.joinedTimestamp) {
      const j = Math.floor(member.joinedTimestamp / 1000);
      datesValue += `\n**Joined:** ${ts(j, "f")} (${ts(j, "R")})`;
    }
    if (member?.premiumSince) {
      const p = Math.floor(member.premiumSince.getTime() / 1000);
      datesValue += `\n**Boosted:** ${ts(p, "f")} (${ts(p, "R")})`;
    }

    const avatarUrl = user.displayAvatarURL({
      size: 512,
      extension: "png",
      forceStatic: false,
    });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setAuthor({
        name: message.author.globalName ?? message.author.username,
        iconURL: message.author.displayAvatarURL({ size: 128 }),
      })
      .setTitle(title)
      .setDescription(description)
      .setThumbnail(avatarUrl)
      .addFields({ name: "Dates", value: datesValue, inline: false });

    if (member && guild) {
      const roleMentions = member.roles.cache
        .filter((r) => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => r.toString());
      const { text, total } = truncateRoleMentions([...roleMentions]);
      embed.addFields({
        name: `Roles (${total})`,
        value: text,
        inline: false,
      });
    }

    const footerParts: string[] = [];
    if (member && guild) {
      if (
        guild.memberCount != null &&
        guild.members.cache.size === guild.memberCount
      ) {
        const sorted = [...guild.members.cache.values()].sort(
          (a, b) =>
            (a.joinedTimestamp ?? 0) - (b.joinedTimestamp ?? 0),
        );
        const pos = sorted.findIndex((m) => m.id === user.id) + 1;
        if (pos > 0) footerParts.push(`Join position: ${pos}`);
      }
      const mutual = message.client.guilds.cache.filter((g) =>
        g.members.cache.has(user.id),
      ).size;
      footerParts.push(
        `${mutual} mutual server${mutual === 1 ? "" : "s"} (cache)`,
      );
    }
    embed
      .setFooter({
        text:
          footerParts.length > 0
            ? footerParts.join(" · ")
            : `User ID: ${user.id}`,
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
