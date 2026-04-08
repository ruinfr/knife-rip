import {
  ButtonStyle,
  parseEmoji,
  PermissionFlagsBits,
} from "discord.js";
import { getSiteApiBase } from "../../config";
import { guildMemberHas } from "../../lib/command-perms";
import {
  applyButtonComponentsToMessage,
  rebuildButtonRoleMessage,
} from "../../lib/button-role-components";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import { parseDiscordMessageUrl } from "../../lib/parse-discord-message-url";
import {
  botCanAssignRole,
  executorMayConfigureRole,
} from "../../lib/role-assignment-safety";
import type { KnifeCommand } from "../types";

function requireManage(message: import("discord.js").Message): boolean {
  return (
    guildMemberHas(message, PermissionFlagsBits.ManageGuild) ||
    guildMemberHas(message, PermissionFlagsBits.ManageRoles)
  );
}

function extractLink(haystack: string): string | null {
  const m =
    /(https?:\/\/(?:www\.)?discord(?:app)?\.com\/channels\/\d+\/\d+\/\d+)/i.exec(
      haystack,
    );
  return m?.[1] ?? null;
}

function parseStyle(s: string): number | null {
  switch (s.toLowerCase()) {
    case "primary":
    case "blurple":
      return ButtonStyle.Primary;
    case "secondary":
    case "grey":
    case "gray":
      return ButtonStyle.Secondary;
    case "success":
    case "green":
      return ButtonStyle.Success;
    case "danger":
    case "red":
      return ButtonStyle.Danger;
    default:
      return null;
  }
}

function emojiJsonFromToken(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  const p = parseEmoji(t);
  if (p?.id) {
    return JSON.stringify({
      id: p.id,
      name: p.name,
      animated: Boolean(p.animated),
    });
  }
  if (t.length >= 1 && t.length <= 8) {
    return JSON.stringify({ name: t });
  }
  return null;
}

export const buttonroleCommand: KnifeCommand = {
  name: "buttonrole",
  aliases: ["br", "brole"],
  description:
    "Role buttons on **bot-sent messages** (needs **Manage Server** / **Manage Roles**)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Auto roles and self-serve roles.",
    usage:
      ".buttonrole add <msg link> @Role primary [emoji] Label · .buttonrole list · .buttonrole remove <link> <index>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    const client = message.client;
    if (!guild || !message.member) {
      await message.reply({
        embeds: [errorEmbed("Use **.buttonrole** in a server.")],
      });
      return;
    }

    const sub = args[0]?.toLowerCase();
    const origin = getSiteApiBase();

    if (!sub || sub === "help") {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Button roles",
            description:
              "The jump link must point to a message **sent by this bot** (Discord only allows editing our own messages).\n\n" +
              "**`.buttonrole add`** `link` `@Role` `primary|secondary|success|danger` `[emoji]` `Label…`\n" +
              "**`.buttonrole remove`** `link` `index` — 1-based button index\n" +
              "**`.buttonrole removeall`** `link`\n" +
              "**`.buttonrole list`**\n" +
              "**`.buttonrole reset`** — remove all button-role configs (clears buttons where possible)\n\n" +
              `Docs: [commands](${origin}/commands)`,
          }),
        ],
      });
      return;
    }

    if (!requireManage(message)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "You need **Manage Server** or **Manage Roles** for button roles.",
          ),
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
        const rows = await prisma.botGuildButtonRole.findMany({
          where: { guildId: guild.id },
          orderBy: [{ channelId: "asc" }, { messageId: "asc" }, { sortIndex: "asc" }],
        });
        const lines = rows.map((r, i) => {
          const role = guild.roles.cache.get(r.roleId);
          const url = `https://discord.com/channels/${r.guildId}/${r.channelId}/${r.messageId}`;
          return `${i + 1}. [\`msg\`](${url}) #${r.sortIndex} → ${role?.toString() ?? r.roleId} — **${r.label}**`;
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Button roles",
              description:
                lines.length > 0 ? lines.join("\n").slice(0, 3900) : "*None.*",
            }),
          ],
        });
        return;
      }

      if (sub === "reset") {
        const rows = await prisma.botGuildButtonRole.findMany({
          where: { guildId: guild.id },
        });
        const keys = new Map<string, { channelId: string; messageId: string }>();
        for (const r of rows) {
          keys.set(`${r.channelId}:${r.messageId}`, {
            channelId: r.channelId,
            messageId: r.messageId,
          });
        }
        await prisma.botGuildButtonRole.deleteMany({
          where: { guildId: guild.id },
        });
        for (const { channelId, messageId } of keys.values()) {
          await rebuildButtonRoleMessage(client, guild.id, channelId, messageId, []);
        }
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Button roles reset",
              description: `Cleared **${rows.length}** button(s) across **${keys.size}** message(s).`,
            }),
          ],
        });
        return;
      }

      if (sub === "add") {
        const tail = args.slice(1).join(" ");
        const linkStr = extractLink(tail);
        const parsed = linkStr ? parseDiscordMessageUrl(linkStr) : null;
        if (!parsed || parsed.guildId !== guild.id || !linkStr) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Provide a **jump link** to a message in this server **from this bot**.",
              ),
            ],
          });
          return;
        }

        const role =
          message.mentions.roles.first() ??
          guild.roles.cache.find((r) => tail.includes(r.id) && r.id !== guild.id);
        if (!role) {
          await message.reply({
            embeds: [errorEmbed("Mention the **role** for this button.")],
          });
          return;
        }
        if (!executorMayConfigureRole(message.member, role)) {
          await message.reply({
            embeds: [
              errorEmbed("You cannot use that role (hierarchy / managed)."),
            ],
          });
          return;
        }
        if (!botCanAssignRole(role)) {
          await message.reply({
            embeds: [
              errorEmbed(
                "I cannot assign that role — raise my **top role** and grant **Manage Roles**.",
              ),
            ],
          });
          return;
        }

        let rest = tail.replace(linkStr, "").trim();
        rest = rest.replace(/<@&\d+>/g, "").trim();
        const parts = rest.split(/\s+/).filter(Boolean);
        const styleStr = parts.shift();
        const st = styleStr ? parseStyle(styleStr) : null;
        if (st == null) {
          await message.reply({
            embeds: [
              errorEmbed(
                "After the role, set a style: **primary**, **secondary**, **success**, or **danger**.",
              ),
            ],
          });
          return;
        }

        let emojiTok: string | undefined;
        if (
          parts[0] &&
          (parts[0].startsWith("<") || [...parts[0]].length <= 4)
        ) {
          emojiTok = parts.shift();
        }
        const label = parts.join(" ").trim().slice(0, 80) || "Role";

        const ch = await guild.channels.fetch(parsed.channelId).catch(() => null);
        if (!ch?.isTextBased()) {
          await message.reply({
            embeds: [errorEmbed("Channel not accessible.")],
          });
          return;
        }
        const targetMsg = await ch.messages.fetch(parsed.messageId).catch(() => null);
        if (!targetMsg) {
          await message.reply({
            embeds: [errorEmbed("Message not found.")],
          });
          return;
        }
        if (targetMsg.author.id !== client.user?.id) {
          await message.reply({
            embeds: [
              errorEmbed(
                "That message was **not sent by this bot**. Post content with me first, then attach buttons to **my** message.",
              ),
            ],
          });
          return;
        }

        const existing = await prisma.botGuildButtonRole.findMany({
          where: {
            guildId: guild.id,
            channelId: parsed.channelId,
            messageId: parsed.messageId,
          },
        });
        if (existing.length >= 25) {
          await message.reply({
            embeds: [
              errorEmbed("Discord allows at most **25** buttons per message."),
            ],
          });
          return;
        }

        const maxIdx = existing.reduce((m, r) => Math.max(m, r.sortIndex), -1);
        const row = await prisma.botGuildButtonRole.create({
          data: {
            guildId: guild.id,
            channelId: parsed.channelId,
            messageId: parsed.messageId,
            roleId: role.id,
            style: st,
            label,
            emojiJson: emojiJsonFromToken(emojiTok),
            sortIndex: maxIdx + 1,
          },
        });

        const nextRows = await prisma.botGuildButtonRole.findMany({
          where: {
            guildId: guild.id,
            channelId: parsed.channelId,
            messageId: parsed.messageId,
          },
          orderBy: { sortIndex: "asc" },
        });
        await applyButtonComponentsToMessage(targetMsg, nextRows);
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Button added",
              description: `**${label}** → ${role.toString()} (row \`${row.id}\`)`,
            }),
          ],
        });
        return;
      }

      if (sub === "remove") {
        const tail = args.slice(1).join(" ");
        const linkStr = extractLink(tail);
        const parsed = linkStr ? parseDiscordMessageUrl(linkStr) : null;
        const idx = Number(args[args.length - 1]);
        if (!parsed || parsed.guildId !== guild.id || !Number.isFinite(idx)) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Usage: **.buttonrole remove** `message link` `index` (1-based)",
              ),
            ],
          });
          return;
        }

        const rows = await prisma.botGuildButtonRole.findMany({
          where: {
            guildId: guild.id,
            channelId: parsed.channelId,
            messageId: parsed.messageId,
          },
          orderBy: { sortIndex: "asc" },
        });
        const target = rows[idx - 1];
        if (!target) {
          await message.reply({
            embeds: [errorEmbed("No button at that **index**. Run **.buttonrole list**.")],
          });
          return;
        }
        await prisma.botGuildButtonRole.delete({ where: { id: target.id } });
        const nextRows = await prisma.botGuildButtonRole.findMany({
          where: {
            guildId: guild.id,
            channelId: parsed.channelId,
            messageId: parsed.messageId,
          },
          orderBy: { sortIndex: "asc" },
        });
        const ch = await guild.channels.fetch(parsed.channelId).catch(() => null);
        if (ch?.isTextBased()) {
          const targetMsg = await ch.messages.fetch(parsed.messageId).catch(() => null);
          if (targetMsg)
            await applyButtonComponentsToMessage(targetMsg, nextRows);
        }
        await message.reply({
          embeds: [minimalEmbed({ title: "Button removed", description: `#${idx}` })],
        });
        return;
      }

      if (sub === "removeall") {
        const tail = args.slice(1).join(" ");
        const linkStr = extractLink(tail) ?? tail;
        const parsed = parseDiscordMessageUrl(linkStr);
        if (!parsed || parsed.guildId !== guild.id) {
          await message.reply({
            embeds: [
              errorEmbed("Usage: **.buttonrole removeall** `message link`"),
            ],
          });
          return;
        }
        await prisma.botGuildButtonRole.deleteMany({
          where: {
            guildId: guild.id,
            channelId: parsed.channelId,
            messageId: parsed.messageId,
          },
        });
        const ch = await guild.channels.fetch(parsed.channelId).catch(() => null);
        if (ch?.isTextBased()) {
          const targetMsg = await ch.messages.fetch(parsed.messageId).catch(() => null);
          if (targetMsg) await targetMsg.edit({ components: [] }).catch(() => {});
        }
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Buttons cleared",
              description: "All button roles removed for that message.",
            }),
          ],
        });
        return;
      }
    } catch (e) {
      await message.reply({
        embeds: [errorEmbed(`Button role error: ${String(e)}`)],
      });
      return;
    }

    await message.reply({
      embeds: [errorEmbed("Unknown — try **.buttonrole help**.")],
    });
  },
};
