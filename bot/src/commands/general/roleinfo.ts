import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

function discordTimestamp(ms: number): string {
  return `<t:${Math.floor(ms / 1000)}:F>`;
}

function hexColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
}

export const roleinfoCommand: ArivixCommand = {
  name: "roleinfo",
  aliases: ["ri"],
  description: "Show details for a role (mention, ID, or name)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".roleinfo @Role · .roleinfo 123… · .roleinfo Mod Team",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.roleinfo** in a server.")],
      });
      return;
    }

    await guild.roles.fetch();

    let role = message.mentions.roles.first();

    if (!role) {
      const raw = args[0]?.trim();
      if (raw && /^\d{17,20}$/.test(raw)) {
        role = guild.roles.cache.get(raw) ?? (await guild.roles.fetch(raw).catch(() => null)) ?? undefined;
      }
    }

    if (!role) {
      const nameQuery = args.join(" ").trim();
      if (nameQuery) {
        const lower = nameQuery.toLowerCase();
        role =
          guild.roles.cache.find((r) => r.name.toLowerCase() === lower) ??
          guild.roles.cache.find((r) => r.name.toLowerCase().includes(lower));
      }
    }

    if (!role) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Mention a role, paste its **ID**, or type part of its **name**.",
          ),
        ],
      });
      return;
    }

    const memberCount = role.members.size;
    const perms = role.permissions.toArray();
    const permPreview =
      perms.length === 0
        ? "None"
        : perms.length <= 12
          ? perms.sort().join(", ")
          : `${perms.slice(0, 12).sort().join(", ")}… (+${perms.length - 12} more)`;

    const lines = [
      `**Mention:** ${role}`,
      `**ID:** \`${role.id}\``,
      `**Color:** ${hexColor(role.color)}${role.color === 0 ? " (default)" : ""}`,
      `**Position:** ${role.position} / ${guild.roles.cache.size - 1}`,
      `**Members (cached):** ${memberCount.toLocaleString()}`,
      `**Hoisted:** ${role.hoist ? "Yes" : "No"} · **Mentionable:** ${role.mentionable ? "Yes" : "No"} · **Managed:** ${role.managed ? "Yes (integration)" : "No"}`,
      `**Created:** ${discordTimestamp(role.createdTimestamp)}`,
      `**Key permissions:** ${permPreview}`,
    ];

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Role — ${role.name}`,
          description: lines.join("\n"),
        }),
      ],
    });
  },
};
