import { PermissionFlagsBits } from "discord.js";
import { getSiteApiBase } from "../../config";
import { guildMemberHas } from "../../lib/command-perms";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import { executorMayConfigureRole, botCanAssignRole } from "../../lib/role-assignment-safety";
import type { KnifeCommand } from "../types";

function requireManage(message: import("discord.js").Message): boolean {
  return (
    guildMemberHas(message, PermissionFlagsBits.ManageGuild) ||
    guildMemberHas(message, PermissionFlagsBits.ManageRoles)
  );
}

export const autoroleCommand: KnifeCommand = {
  name: "autorole",
  aliases: ["joinrole", "joinroles"],
  description:
    "Automatic roles on join (requires **Manage Server** or **Manage Roles** to change)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Auto roles and self-serve roles.",
    usage:
      ".autorole · .autorole add @Role · .autorole list · .autorole remove @Role · .autorole reset",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    if (!guild || !message.member) {
      await message.reply({
        embeds: [errorEmbed("Use **.autorole** in a server.")],
      });
      return;
    }

    const sub = args[0]?.toLowerCase();
    const origin = getSiteApiBase();

    if (!sub || sub === "help") {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Autorole",
            description:
              "Roles are applied **after** hardban checks and **before** sticky roles.\n\n" +
              "**`.autorole add`** `@Role`\n" +
              "**`.autorole remove`** `@Role`\n" +
              "**`.autorole list`**\n" +
              "**`.autorole reset`** — clear all\n\n" +
              `Docs: [${origin.replace(/^https?:\/\//, "")}/commands](${origin}/commands)`,
          }),
        ],
      });
      return;
    }

    let prisma;
    try {
      prisma = getBotPrisma();
    } catch {
      await message.reply({ embeds: [errorEmbed("Database unavailable.")] });
      return;
    }

    try {
      if (sub === "list") {
        if (!requireManage(message)) {
          await message.reply({
            embeds: [
              errorEmbed("You need **Manage Server** or **Manage Roles** to list autoroles."),
            ],
          });
          return;
        }
        const rows = await prisma.botGuildAutorole.findMany({
          where: { guildId: guild.id },
          orderBy: { createdAt: "asc" },
        });
        const lines = rows.map((r) => {
          const role = guild.roles.cache.get(r.roleId);
          return role
            ? `• ${role.toString()} (\`${r.roleId}\`)`
            : `• *\`deleted role\` — \`${r.roleId}\`*`;
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Autoroles",
              description:
                lines.length > 0 ? lines.join("\n") : "*No autoroles configured.*",
            }),
          ],
        });
        return;
      }

      if (!requireManage(message)) {
        await message.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Server** or **Manage Roles** to modify autoroles.",
            ),
          ],
        });
        return;
      }

      if (sub === "add") {
        const role =
          message.mentions.roles.first() ??
          (args[1] ? guild.roles.cache.get(args[1].replace(/[^0-9]/g, "")) : null);
        if (!role || role.id === guild.id) {
          await message.reply({
            embeds: [errorEmbed("Mention a **role** or pass a **role ID**.")],
          });
          return;
        }
        if (!executorMayConfigureRole(message.member, role)) {
          await message.reply({
            embeds: [
              errorEmbed(
                "You cannot assign that role (hierarchy, managed role, or **@everyone**).",
              ),
            ],
          });
          return;
        }
        if (!botCanAssignRole(role)) {
          await message.reply({
            embeds: [
              errorEmbed(
                "The bot cannot grant that role — move my highest role **above** it and ensure I have **Manage Roles**.",
              ),
            ],
          });
          return;
        }
        await prisma.botGuildAutorole.upsert({
          where: {
            guildId_roleId: { guildId: guild.id, roleId: role.id },
          },
          create: { guildId: guild.id, roleId: role.id },
          update: {},
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Autorole added",
              description: `${role.toString()} will be given on join.`,
            }),
          ],
        });
        return;
      }

      if (sub === "remove") {
        const role =
          message.mentions.roles.first() ??
          (args[1] ? guild.roles.cache.get(args[1].replace(/[^0-9]/g, "")) : null);
        if (!role) {
          await message.reply({
            embeds: [errorEmbed("Mention a **role** to remove from autoroles.")],
          });
          return;
        }
        await prisma.botGuildAutorole.deleteMany({
          where: { guildId: guild.id, roleId: role.id },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Autorole removed",
              description: role.toString(),
            }),
          ],
        });
        return;
      }

      if (sub === "reset") {
        await prisma.botGuildAutorole.deleteMany({
          where: { guildId: guild.id },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Autoroles cleared",
              description: "All automatic join roles were removed from config.",
            }),
          ],
        });
        return;
      }
    } catch (e) {
      await message.reply({
        embeds: [errorEmbed(`Autorole error: ${String(e)}`)],
      });
      return;
    }

    await message.reply({
      embeds: [errorEmbed("Unknown subcommand — try **.autorole help**.")],
    });
  },
};
