import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const membersCommand: KnifeCommand = {
  name: "members",
  aliases: ["inrole", "rolemembers"],
  description: "List members that have a specific role (from cache)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server insight.",
    usage: ".members @Role · .members role_id",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.members** in a server.")],
      });
      return;
    }

    const mention = message.mentions.roles.first();
    const idArg = args.find((a) => /^\d{17,20}$/.test(a));
    let role = mention ?? (idArg ? guild.roles.cache.get(idArg) : null);

    if (!role && args.length > 0) {
      const q = args.join(" ").toLowerCase();
      role =
        guild.roles.cache.find((r) => r.name.toLowerCase() === q) ?? null;
    }

    if (!role || role.id === guild.id) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Mention a **role**, pass a **role ID**, or type the **exact role name**.",
          ),
        ],
      });
      return;
    }

    try {
      if (guild.memberCount < 5000) {
        await guild.members.fetch().catch(() => {});
      }
    } catch {
      /* ignore */
    }

    const withRole = [...guild.members.cache.values()].filter((m) =>
      m.roles.cache.has(role!.id),
    );
    const lines = withRole
      .sort((a, b) => a.user.username.localeCompare(b.user.username))
      .slice(0, 35)
      .map((m) => m.user.tag);

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(role.color || 0x2b2d31)
          .setTitle(`Members with @${role.name}`)
          .setDescription(
            lines.length > 0
              ? lines.join("\n").slice(0, 3900)
              : "*Nobody in cache has this role.*",
          )
          .setFooter({ text: `${withRole.length} member(s)` }),
      ],
    });
  },
};
