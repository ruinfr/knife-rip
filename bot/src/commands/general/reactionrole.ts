import { PermissionFlagsBits } from "discord.js";
import { guildMemberHas } from "../../lib/command-perms";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import { parseEmojiKeyFromArg } from "../../lib/emoji-key";
import { parseDiscordMessageUrl } from "../../lib/parse-discord-message-url";
import {
  executorMayConfigureRole,
  botCanAssignRole,
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

export const reactionroleCommand: KnifeCommand = {
  name: "reactionrole",
  aliases: ["rr", "rrole"],
  description: "Self-assign roles via message reactions (configure with **Manage Roles**)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Auto roles and self-serve roles.",
    usage:
      ".reactionrole · .reactionrole add <msg link> <:emoji:> @Role · .reactionrole list · .reactionrole restore on|off",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    if (!guild || !message.member) {
      await message.reply({
        embeds: [errorEmbed("Use **.reactionrole** in a server.")],
      });
      return;
    }

    const sub = args[0]?.toLowerCase();
    if (!sub || sub === "help") {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Reaction roles",
            description:
              "**`.reactionrole add`** `message link` `emoji` `@Role`\n" +
              "**`.reactionrole remove`** `message link` `emoji`\n" +
              "**`.reactionrole removeall`** `message link`\n" +
              "**`.reactionrole list`**\n" +
              "**`.reactionrole reset`** — delete all mappings in this server\n" +
              "**`.reactionrole restore`** `on|off` — re-grant reaction roles on rejoin\n\n" +
              "The bot will **react** with the emoji you set so members can match it easily.",
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
      if (sub === "restore") {
        if (!requireManage(message)) {
          await message.reply({
            embeds: [
              errorEmbed("You need **Manage Server** or **Manage Roles**."),
            ],
          });
          return;
        }
        const on = args[1]?.toLowerCase();
        const val = on === "on" || on === "true" || on === "yes" || on === "1";
        const off = on === "off" || on === "false" || on === "no" || on === "0";
        if (!on || (!val && !off)) {
          await message.reply({
            embeds: [
              errorEmbed("Usage: **.reactionrole restore** `on` or `off`"),
            ],
          });
          return;
        }
        await prisma.botGuildReactionRoleSettings.upsert({
          where: { guildId: guild.id },
          create: { guildId: guild.id, restoreOnRejoin: val },
          update: { restoreOnRejoin: val },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Reaction role restore",
              description: val
                ? "Members will get their **saved** reaction roles back when they rejoin."
                : "On leave, saved reaction-role grants are **cleared** (default).",
            }),
          ],
        });
        return;
      }

      if (sub === "list") {
        if (!requireManage(message)) {
          await message.reply({
            embeds: [
              errorEmbed("You need **Manage Server** or **Manage Roles** to list."),
            ],
          });
          return;
        }
        const rows = await prisma.botGuildReactionRole.findMany({
          where: { guildId: guild.id },
          orderBy: { createdAt: "asc" },
        });
        const lines = rows.map((r) => {
          const role = guild.roles.cache.get(r.roleId);
          const url = `https://discord.com/channels/${r.guildId}/${r.channelId}/${r.messageId}`;
          return `• [\`message\`](${url}) **${r.emojiKey}** → ${role?.toString() ?? r.roleId}`;
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Reaction roles",
              description:
                lines.length > 0
                  ? lines.join("\n").slice(0, 3900)
                  : "*None configured.*",
            }),
          ],
        });
        return;
      }

      if (sub === "reset") {
        if (!requireManage(message)) {
          await message.reply({
            embeds: [
              errorEmbed("You need **Manage Server** or **Manage Roles**."),
            ],
          });
          return;
        }
        const n = await prisma.botGuildReactionRole.deleteMany({
          where: { guildId: guild.id },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Reaction roles reset",
              description: `Removed **${n.count}** mapping(s).`,
            }),
          ],
        });
        return;
      }

      if (sub === "add") {
        if (!requireManage(message)) {
          await message.reply({
            embeds: [
              errorEmbed(
                "You need **Manage Server** or **Manage Roles** to add reaction roles.",
              ),
            ],
          });
          return;
        }
        const tail = args.slice(1).join(" ");
        const link = extractLink(tail) ?? parseDiscordMessageUrl(tail);
        const parsed =
          typeof link === "string"
            ? parseDiscordMessageUrl(link)
            : link;
        if (!parsed || parsed.guildId !== guild.id) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Include a **message link from this server** (jump link).",
              ),
            ],
          });
          return;
        }

        const role =
          message.mentions.roles.first() ??
          guild.roles.cache.find(
            (r) => tail.includes(r.id) && r.id !== guild.id,
          );
        if (!role) {
          await message.reply({
            embeds: [errorEmbed("Mention the **role** to assign.")],
          });
          return;
        }
        if (!executorMayConfigureRole(message.member, role)) {
          await message.reply({
            embeds: [
              errorEmbed("You cannot configure that role (hierarchy / managed)."),
            ],
          });
          return;
        }
        if (!botCanAssignRole(role)) {
          await message.reply({
            embeds: [
              errorEmbed(
                "I cannot assign that role — check **Manage Roles** and role order above me.",
              ),
            ],
          });
          return;
        }

        let emojiRaw = tail;
        for (const chunk of [
          `https://discord.com/channels/${parsed.guildId}/${parsed.channelId}/${parsed.messageId}`,
          `https://discordapp.com/channels/${parsed.guildId}/${parsed.channelId}/${parsed.messageId}`,
        ]) {
          emojiRaw = emojiRaw.replace(chunk, " ");
        }
        emojiRaw = emojiRaw.replace(/<@&\d+>/g, " ").replace(/\s+/g, " ").trim();
        const emojiMatch = emojiRaw.match(/<a?:\w+:\d+>/)?.[0] ?? emojiRaw.split(" ")[0];
        const emojiKey = parseEmojiKeyFromArg(emojiMatch ?? "");
        if (!emojiKey) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Provide an **emoji** after the link — unicode or `<:name:id>`.",
              ),
            ],
          });
          return;
        }

        const ch = await guild.channels.fetch(parsed.channelId).catch(() => null);
        if (!ch?.isTextBased()) {
          await message.reply({
            embeds: [errorEmbed("Channel not accessible.")],
          });
          return;
        }
        const msg = await ch.messages.fetch(parsed.messageId).catch(() => null);
        if (!msg) {
          await message.reply({
            embeds: [errorEmbed("Message not found.")],
          });
          return;
        }

        await prisma.botGuildReactionRole.create({
          data: {
            guildId: guild.id,
            channelId: parsed.channelId,
            messageId: parsed.messageId,
            emojiKey,
            roleId: role.id,
          },
        });

        try {
          if (emojiKey.startsWith("c:")) {
            const id = emojiKey.slice(2);
            const em = guild.emojis.cache.get(id);
            await msg.react(em ?? id);
          } else {
            const uni = emojiKey.slice(2);
            await msg.react(uni);
          }
        } catch {
          await message.reply({
            embeds: [
              errorEmbed(
                "Mapping saved, but I could not add that reaction (permissions, unknown emoji, or reaction limit).",
              ),
            ],
          });
          return;
        }

        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Reaction role added",
              description: `${emojiKey} → ${role.toString()}`,
            }),
          ],
        });
        return;
      }

      if (sub === "remove") {
        if (!requireManage(message)) {
          await message.reply({
            embeds: [
              errorEmbed("You need **Manage Server** or **Manage Roles**."),
            ],
          });
          return;
        }
        const tail = args.slice(1).join(" ");
        const linkStr = extractLink(tail);
        const parsed = linkStr ? parseDiscordMessageUrl(linkStr) : null;
        if (!parsed || parsed.guildId !== guild.id || !linkStr) {
          await message.reply({
            embeds: [errorEmbed("Usage: **.reactionrole remove** `message link` `emoji`")],
          });
          return;
        }
        const cleaned = tail
          .replace(linkStr, "")
          .replace(/\s+/g, " ")
          .trim();
        const emojiKey = parseEmojiKeyFromArg(
          cleaned.match(/<a?:\w+:\d+>/)?.[0] ?? cleaned.split(" ")[0] ?? "",
        );
        if (!emojiKey) {
          await message.reply({
            embeds: [errorEmbed("Include the **emoji** to unbind.")],
          });
          return;
        }
        await prisma.botGuildReactionRole.deleteMany({
          where: {
            guildId: guild.id,
            channelId: parsed.channelId,
            messageId: parsed.messageId,
            emojiKey,
          },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Reaction role removed",
              description: `${emojiKey} on that message.`,
            }),
          ],
        });
        return;
      }

      if (sub === "removeall") {
        if (!requireManage(message)) {
          await message.reply({
            embeds: [
              errorEmbed("You need **Manage Server** or **Manage Roles**."),
            ],
          });
          return;
        }
        const tail = args.slice(1).join(" ");
        const linkStr = extractLink(tail) ?? tail;
        const parsed = parseDiscordMessageUrl(linkStr);
        if (!parsed || parsed.guildId !== guild.id) {
          await message.reply({
            embeds: [
              errorEmbed("Usage: **.reactionrole removeall** `message link`"),
            ],
          });
          return;
        }
        const n = await prisma.botGuildReactionRole.deleteMany({
          where: {
            guildId: guild.id,
            channelId: parsed.channelId,
            messageId: parsed.messageId,
          },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Removed from message",
              description: `Deleted **${n.count}** reaction role mapping(s).`,
            }),
          ],
        });
        return;
      }
    } catch (e) {
      const dup =
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code?: string }).code === "P2002";
      await message.reply({
        embeds: [
          errorEmbed(
            dup
              ? "That **emoji** is already bound on that message."
              : `Reaction role error: ${String(e)}`,
          ),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [errorEmbed("Unknown — try **.reactionrole help**.")],
    });
  },
};
