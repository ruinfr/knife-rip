import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { BotCommandRoleOverrideEffect } from "@prisma/client";
import { errorEmbed, minimalEmbed, missingPermissionEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import {
  GUILD_COMMAND_SCOPE_ALL,
  NON_CONFIGURABLE_COMMAND_KEYS,
  invalidateGuildCommandRulesCache,
} from "../../lib/guild-command-rules";
import { hasGuildPermission } from "../../lib/discord-member-perms";
import { getGuildCommandPrefix } from "../../lib/guild-prefix";
import type { KnifeCommand } from "../types";

const SNOWFLAKE = /^\d{17,20}$/;

const HELP =
  "**Usage**\n" +
  "• **`<p>command`** or **`<p>cmd`** — same command\n" +
  "• **`<p>command disable`** `<cmd>` `<#channel|all>` — block a command in one channel or server-wide\n" +
  "• **`<p>command enable`** `<cmd>` `<#channel|all>` — remove that block\n" +
  "• **`<p>command override enable`** `<cmd>` `<@role|id>` `<#channel|all>` — role can still use the command where it's disabled\n" +
  "• **`<p>command override disable`** `<cmd>` `<@role|id>` `<#channel|all>` — role cannot use the command in that scope\n" +
  "• **`<p>command override remove`** `<cmd>` `<@role|id>` `<#channel|all>` — delete override for that role + scope\n\n" +
  "`command` / `prefix` cannot be disabled. **Manage Server** required (no owner bypass). Server-wide scope: **`all`** or **`*`**. Threads use their **parent channel** for rules.";

function helpWithPrefix(p: string): string {
  return HELP.replace(/<p>/g, p);
}

function invokerCanManageGuild(message: Message): Promise<boolean> {
  return hasGuildPermission(message, PermissionFlagsBits.ManageGuild);
}

function parseScope(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (t === "all" || t === "*") return GUILD_COMMAND_SCOPE_ALL;
  const m = raw.trim().match(/^<#(\d+)>$/);
  if (m) return m[1];
  if (SNOWFLAKE.test(raw.trim())) return raw.trim();
  return null;
}

function parseRoleId(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^<@&(\d+)>$/);
  if (m) return m[1];
  if (SNOWFLAKE.test(raw.trim())) return raw.trim();
  return null;
}

function scopeLabel(scope: string): string {
  return scope === GUILD_COMMAND_SCOPE_ALL ? "**all channels**" : `<#${scope}>`;
}

export const commandConfigCommand: KnifeCommand = {
  name: "command",
  aliases: ["cmd"],
  description:
    "Manage Server only — disable/enable commands by channel or server; role overrides (same permission as dashboard server settings)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage:
      ".command / .cmd — disable|enable <cmd> <#ch|all> · override enable|disable|remove …",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("Use **command** in a server.")],
      });
      return;
    }

    if (!(await invokerCanManageGuild(message))) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Server")],
      });
      return;
    }

    const { resolveCanonicalCommandName, buildCommandMap } = await import(
      "../registry"
    );
    const cmdMap = buildCommandMap();
    const p = await getGuildCommandPrefix(message.guildId);

    const guildId = message.guild.id;

    const head = args[0]?.toLowerCase();
    if (!head) {
      await message.reply({ embeds: [errorEmbed(helpWithPrefix(p))] });
      return;
    }

    if (head === "override") {
      const mode = args[1]?.toLowerCase();
      const cmdRaw = args[2];
      const roleRaw = args[3];
      const scopeRaw = args[4];

      if (
        !mode ||
        !cmdRaw ||
        !roleRaw ||
        !scopeRaw ||
        ["enable", "disable", "remove"].indexOf(mode) === -1
      ) {
        await message.reply({ embeds: [errorEmbed(helpWithPrefix(p))] });
        return;
      }

      const cmdKey = resolveCanonicalCommandName(cmdRaw, cmdMap);
      if (!cmdKey) {
        await message.reply({
          embeds: [errorEmbed(`Unknown command: **${cmdRaw}**`)],
        });
        return;
      }
      if (NON_CONFIGURABLE_COMMAND_KEYS.has(cmdKey)) {
        await message.reply({
          embeds: [
            errorEmbed(
              `**${cmdKey}** can't use role overrides (meta / prefix commands).`,
            ),
          ],
        });
        return;
      }

      const roleId = parseRoleId(roleRaw);
      const channelScope = parseScope(scopeRaw);
      if (!roleId || !channelScope) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Give a **role** (mention or id) and scope **`all`** or a **#channel**.",
            ),
          ],
        });
        return;
      }

      try {
        const prisma = getBotPrisma();
        if (mode === "remove") {
          const del = await prisma.botGuildCommandRoleOverride.deleteMany({
            where: { guildId, commandKey: cmdKey, roleId, channelScope },
          });
          invalidateGuildCommandRulesCache(guildId);
          await message.reply({
            embeds: [
              minimalEmbed({
                title: "Override removed",
                description:
                  del.count > 0
                    ? `Cleared overrides for **${cmdKey}** · role <@&${roleId}> · ${scopeLabel(channelScope)}`
                    : `No matching override for **${cmdKey}** · that role · ${scopeLabel(channelScope)}.`,
              }),
            ],
          });
          return;
        }

        const effect =
          mode === "enable"
            ? BotCommandRoleOverrideEffect.ALLOW
            : BotCommandRoleOverrideEffect.DENY;

        await prisma.botGuildCommandRoleOverride.upsert({
          where: {
            guildId_commandKey_roleId_channelScope: {
              guildId,
              commandKey: cmdKey,
              roleId,
              channelScope,
            },
          },
          create: {
            guildId,
            commandKey: cmdKey,
            roleId,
            channelScope,
            effect,
          },
          update: { effect },
        });
        invalidateGuildCommandRulesCache(guildId);
        const desc =
          mode === "enable"
            ? `Members with <@&${roleId}> may use **.${cmdKey}** in ${scopeLabel(channelScope)} even when it's disabled for others.`
            : `Members with <@&${roleId}> cannot use **.${cmdKey}** in ${scopeLabel(channelScope)}.`;
        await message.reply({
          embeds: [
            minimalEmbed({
              title: mode === "enable" ? "Bypass override" : "Deny override",
              description: desc,
            }),
          ],
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await message.reply({
          embeds: [
            errorEmbed(
              `Database error — is **DATABASE_URL** set? ${msg.slice(0, 200)}`,
            ),
          ],
        });
      }
      return;
    }

    if (head !== "disable" && head !== "enable") {
      await message.reply({ embeds: [errorEmbed(helpWithPrefix(p))] });
      return;
    }

    const cmdRaw = args[1];
    const scopeRaw = args[2];
    if (!cmdRaw || !scopeRaw || args.length > 3) {
      await message.reply({ embeds: [errorEmbed(helpWithPrefix(p))] });
      return;
    }

    const cmdKey = resolveCanonicalCommandName(cmdRaw, cmdMap);
    if (!cmdKey) {
      await message.reply({
        embeds: [errorEmbed(`Unknown command: **${cmdRaw}**`)],
      });
      return;
    }
    if (NON_CONFIGURABLE_COMMAND_KEYS.has(cmdKey)) {
      await message.reply({
        embeds: [
          errorEmbed(`**${cmdKey}** can't be disabled (needed to configure Arivix).`),
        ],
      });
      return;
    }

    const channelScope = parseScope(scopeRaw);
    if (!channelScope) {
      await message.reply({
        embeds: [
          errorEmbed("Scope must be **`all`** or a **#channel** (or channel id)."),
        ],
      });
      return;
    }

    try {
      const prisma = getBotPrisma();
      if (head === "disable") {
        await prisma.botGuildCommandDisable.upsert({
          where: {
            guildId_commandKey_channelScope: {
              guildId,
              commandKey: cmdKey,
              channelScope,
            },
          },
          create: { guildId, commandKey: cmdKey, channelScope },
          update: {},
        });
        invalidateGuildCommandRulesCache(guildId);
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Command disabled",
              description: `**.${cmdKey}** is off in ${scopeLabel(channelScope)} for members without an **override allow**.`,
            }),
          ],
        });
        return;
      }

      const del = await prisma.botGuildCommandDisable.deleteMany({
        where: { guildId, commandKey: cmdKey, channelScope },
      });
      invalidateGuildCommandRulesCache(guildId);
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Command enabled",
            description:
              del.count > 0
                ? `**.${cmdKey}** works again in ${scopeLabel(channelScope)} (subject to other rules).`
                : `No disable rule matched **.${cmdKey}** in ${scopeLabel(channelScope)}.`,
          }),
        ],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await message.reply({
        embeds: [
          errorEmbed(
            `Database error — is **DATABASE_URL** set? ${msg.slice(0, 200)}`,
          ),
        ],
      });
    }
  },
};
