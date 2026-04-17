import { PermissionFlagsBits } from "discord.js";
import { getBotPrisma } from "../../lib/db-prisma";
import { invalidateGuildCommandRulesCache } from "../../lib/guild-command-rules";
import {
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import { getGuildCommandPrefix } from "../../lib/guild-prefix";
import type { ArivixCommand } from "../types";

const SNOWFLAKE = /^\d{17,20}$/;

function parseRoleId(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^<@&(\d+)>$/);
  if (m) return m[1];
  if (SNOWFLAKE.test(raw.trim())) return raw.trim();
  return null;
}

async function requireManageGuild(message: import("discord.js").Message) {
  const g = message.guild;
  if (!g)
    return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return missingPermissionEmbed("you", "Manage Server");
  }
  return null;
}

export const restrictcommandCommand: ArivixCommand = {
  name: "restrictcommand",
  aliases: ["restrictcmd", "cmdrestrict"],
  description:
    "Exclusive allowlist: only listed roles may use a command — **Manage Server**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage:
      ".restrictcommand add `<cmd>` `<@role>` · remove · list · reset",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageGuild(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const guild = message.guild!;
    const prisma = getBotPrisma();
    const head = args[0]?.toLowerCase();
    const p = await getGuildCommandPrefix(guild.id);

    if (!head || head === "list") {
      const cmdFilter = args[1]?.toLowerCase();
      const rows = await prisma.botGuildCommandRestrictAllow.findMany({
        where: { guildId: guild.id },
        orderBy: [{ commandKey: "asc" }, { roleId: "asc" }],
      });
      const filtered = cmdFilter
        ? rows.filter((r) => r.commandKey === cmdFilter)
        : rows;
      if (filtered.length === 0) {
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Restricted commands",
              description:
                "_No exclusive restrictions._ Use **restrictcommand** to add.",
            }),
          ],
        });
        return;
      }
      const lines = filtered.map(
        (r) => `**\`${r.commandKey}\`** → <@&${r.roleId}>`,
      );
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Command allowlist (exclusive)",
            description: lines.join("\n").slice(0, 3900),
          }),
        ],
      });
      return;
    }

    if (head === "reset") {
      const n = await prisma.botGuildCommandRestrictAllow.deleteMany({
        where: { guildId: guild.id },
      });
      invalidateGuildCommandRulesCache(guild.id);
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Reset",
            description: `Removed **${n.count}** restriction row(s).`,
          }),
        ],
      });
      return;
    }

    if (head === "add") {
      const cmdKey = args[1]?.toLowerCase();
      const roleId = parseRoleId(args[2]);
      if (!cmdKey || !roleId) {
        await message.reply({
          embeds: [
            errorEmbed(
              `Usage: **${p}restrictcommand add** \`<cmd>\` \`<@role|id>\``,
            ),
          ],
        });
        return;
      }
      await prisma.botGuildCommandRestrictAllow.upsert({
        where: {
          guildId_commandKey_roleId: {
            guildId: guild.id,
            commandKey: cmdKey,
            roleId,
          },
        },
        create: { guildId: guild.id, commandKey: cmdKey, roleId },
        update: {},
      });
      invalidateGuildCommandRulesCache(guild.id);
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Added",
            description: `Only roles on the list may use **\`${cmdKey}\`** (others blocked).`,
          }),
        ],
      });
      return;
    }

    if (head === "remove") {
      const cmdKey = args[1]?.toLowerCase();
      const roleId = parseRoleId(args[2]);
      if (!cmdKey || !roleId) {
        await message.reply({
          embeds: [
            errorEmbed(
              `Usage: **${p}restrictcommand remove** \`<cmd>\` \`<@role|id>\``,
            ),
          ],
        });
        return;
      }
      await prisma.botGuildCommandRestrictAllow.deleteMany({
        where: { guildId: guild.id, commandKey: cmdKey, roleId },
      });
      invalidateGuildCommandRulesCache(guild.id);
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Removed",
            description: `**${cmdKey}** no longer tied to that role (other rows may remain).`,
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        errorEmbed(
          `**${p}restrictcommand** add | remove | list | reset — Manage Server`,
        ),
      ],
    });
  },
};
