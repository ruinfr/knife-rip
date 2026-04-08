import { ChannelType } from "discord.js";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import type { KnifeCommand } from "../types";

const KEYWORD_MAX = 64;

export const highlightCommand: KnifeCommand = {
  name: "highlight",
  aliases: ["hl"],
  description:
    "Keyword alerts — DM when someone says a word (subcommands: add, remove, list, reset, ignore)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Notifications.",
    usage:
      ".highlight add <word> · .highlight remove <word> · .highlight list · .highlight ignore @target",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Highlights only work in servers.")],
      });
      return;
    }

    const sub = args[0]?.toLowerCase();
    if (!sub || sub === "help") {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Highlight",
            description:
              "**`.highlight add`** `keyword`\n" +
              "**`.highlight remove`** `keyword`\n" +
              "**`.highlight list`** — your keywords\n" +
              "**`.highlight reset`** — clear yours\n" +
              "**`.highlight ignore`** `@member` | `#channel` | `@role`\n" +
              "**`.highlight ignore list`**",
          }),
        ],
      });
      return;
    }

    let prisma;
    try {
      prisma = getBotPrisma();
    } catch {
      await message.reply({
        embeds: [errorEmbed("Database unavailable.")],
      });
      return;
    }

    const uid = message.author.id;

    try {
      if (sub === "add") {
        const kw = args.slice(1).join(" ").trim();
        if (!kw || kw.length > KEYWORD_MAX) {
          await message.reply({
            embeds: [
              errorEmbed(`Provide a keyword (1–${KEYWORD_MAX} characters).`),
            ],
          });
          return;
        }
        await prisma.botGuildHighlightKeyword.create({
          data: { guildId: guild.id, userId: uid, keyword: kw },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Highlight added",
              description: `You will get a DM when \`${kw.slice(0, 200)}\` is said.`,
            }),
          ],
        });
        return;
      }

      if (sub === "remove") {
        const kw = args.slice(1).join(" ").trim();
        if (!kw) {
          await message.reply({
            embeds: [errorEmbed("Usage: **.highlight remove** `keyword`")],
          });
          return;
        }
        await prisma.botGuildHighlightKeyword.deleteMany({
          where: { guildId: guild.id, userId: uid, keyword: kw },
        });
        await message.reply({
          embeds: [minimalEmbed({ title: "Removed", description: `\`${kw}\`` })],
        });
        return;
      }

      if (sub === "list") {
        const rows = await prisma.botGuildHighlightKeyword.findMany({
          where: { guildId: guild.id, userId: uid },
          orderBy: { createdAt: "asc" },
        });
        const body =
          rows.length > 0
            ? rows.map((r) => `• \`${r.keyword}\``).join("\n")
            : "*No keywords saved.*";
        await message.reply({
          embeds: [
            minimalEmbed({ title: "Your highlights", description: body }),
          ],
        });
        return;
      }

      if (sub === "reset") {
        await prisma.botGuildHighlightKeyword.deleteMany({
          where: { guildId: guild.id, userId: uid },
        });
        await prisma.botGuildHighlightIgnore.deleteMany({
          where: { guildId: guild.id, subscriberId: uid },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Reset",
              description: "Cleared your keywords and ignore rules here.",
            }),
          ],
        });
        return;
      }

      if (sub === "ignore") {
        if (args[1]?.toLowerCase() === "list") {
          const rows = await prisma.botGuildHighlightIgnore.findMany({
            where: { guildId: guild.id, subscriberId: uid },
          });
          const lines = rows.map((r) => `• **${r.targetType}** \`${r.targetId}\``);
          await message.reply({
            embeds: [
              minimalEmbed({
                title: "Your highlight ignores",
                description:
                  lines.length > 0 ? lines.join("\n") : "*Empty.*",
              }),
            ],
          });
          return;
        }

        const mem = message.mentions.members?.first();
        const role = message.mentions.roles.first();
        const chM = message.mentions.channels.first();

        let targetType: string | null = null;
        let targetId: string | null = null;

        if (mem) {
          targetType = "member";
          targetId = mem.id;
        } else if (role && role.id !== guild.id) {
          targetType = "role";
          targetId = role.id;
        } else if (
          chM &&
          chM.type !== ChannelType.GuildCategory &&
          "guildId" in chM &&
          chM.guildId === guild.id
        ) {
          targetType = "channel";
          targetId = chM.id;
        }

        if (!targetType || !targetId) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Mention a **member**, **role**, or **channel** to ignore for your highlights.",
              ),
            ],
          });
          return;
        }

        await prisma.botGuildHighlightIgnore.upsert({
          where: {
            guildId_subscriberId_targetType_targetId: {
              guildId: guild.id,
              subscriberId: uid,
              targetType,
              targetId,
            },
          },
          create: {
            guildId: guild.id,
            subscriberId: uid,
            targetType,
            targetId,
          },
          update: {},
        });

        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Ignore added",
              description: `${targetType} \`${targetId}\``,
            }),
          ],
        });
        return;
      }
    } catch (e) {
      const msg =
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code?: string }).code === "P2002"
          ? "That keyword is **already** on your list."
          : "Could not update highlights (duplicate or DB error).";
      await message.reply({ embeds: [errorEmbed(msg)] });
      return;
    }

    await message.reply({
      embeds: [errorEmbed("Unknown **.highlight** subcommand — try **.highlight help**.")],
    });
  },
};
