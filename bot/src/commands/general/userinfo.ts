import { minimalEmbed } from "../../lib/embeds";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import type { KnifeCommand } from "../types";

function discordTimestamp(ms: number, style: "F" | "R" = "F"): string {
  return `<t:${Math.floor(ms / 1000)}:${style}>`;
}

export const userinfoCommand: KnifeCommand = {
  name: "userinfo",
  aliases: ["ui"],
  description: "Show profile info for a user (mention, ID, or yourself)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".userinfo [@user | user ID]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const user = await resolveTargetUser(message, args);
    const display = user.globalName ?? user.username;
    const lines = [
      `**User:** ${display} (\`${user.tag}\`)`,
      `**ID:** \`${user.id}\``,
      `**Account created:** ${discordTimestamp(user.createdTimestamp)}`,
    ];

    if (message.guild) {
      try {
        const member = await message.guild.members.fetch(user.id);
        if (member.joinedAt) {
          lines.push(
            `**Joined server:** ${discordTimestamp(member.joinedAt.getTime())}`,
          );
        }
        if (member.nickname) {
          lines.push(`**Server nickname:** ${member.nickname}`);
        }
        const roleCount = member.roles.cache.size - 1;
        if (roleCount > 0) {
          lines.push(`**Roles:** ${roleCount}`);
        }
      } catch {
        /* not in guild or fetch failed */
      }
    }

    const avatarUrl = user.displayAvatarURL({
      size: 512,
      extension: "png",
      forceStatic: false,
    });

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `User — ${display}`,
          description: lines.join("\n"),
          imageUrl: avatarUrl,
        }),
      ],
    });
  },
};
