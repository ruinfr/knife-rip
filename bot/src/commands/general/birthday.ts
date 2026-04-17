import { PermissionFlagsBits } from "discord.js";
import { guildMemberHas } from "../../lib/command-perms";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import type { ArivixCommand } from "../types";

function parseMonthDay(raw: string): { month: number; day: number } | null {
  const s = raw.trim();
  const a = /^(\d{1,2})[/-](\d{1,2})$/.exec(s);
  if (a) {
    const month = Number(a[1]);
    const day = Number(a[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
  }
  const b = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (b) {
    const month = Number(b[1]);
    const day = Number(b[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31)
      return { month, day };
  }
  return null;
}

export const birthdayCommand: ArivixCommand = {
  name: "birthday",
  aliases: ["bday"],
  description: "Birthdays for this server (stored in DB — subs: set, list, config, …)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Community.",
    usage: ".birthday · .birthday set MM-DD · .birthday @user",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.birthday** in a server.")],
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

    const sub = args[0]?.toLowerCase();

    if (sub === "help") {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Birthday commands",
            description:
              "**`.birthday`** — show yours or **`@user`**\n" +
              "**`.birthday set`** `MM-DD`\n" +
              "**`.birthday list`** · **`.birthday unlock`** · **`.birthday config`**\n" +
              "Mods: **`.birthday lock`**, **`channel`**, **`role`**, **`celebrate`** `[role]`, **`celebrate list`**",
          }),
        ],
      });
      return;
    }

    if (
      !sub ||
      message.mentions.users.first() ||
      (/^\d{17,20}$/.test(args[0] ?? "") && args.length === 1)
    ) {
      const target = await resolveTargetUser(message, args);
      const row = await prisma.botGuildMemberBirthday.findUnique({
        where: {
          guildId_userId: { guildId: guild.id, userId: target.id },
        },
      });
      if (!row || !row.unlocked) {
        await message.reply({
          embeds: [
            errorEmbed(
              row && !row.unlocked
                ? "That birthday is **hidden**."
                : "No birthday saved for that user.",
            ),
          ],
        });
        return;
      }
      const y = row.year ? `, ${row.year}` : "";
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${target.username}'s birthday`,
            description: `**${String(row.month).padStart(2, "0")}-${String(row.day).padStart(2, "0")}**${y}`,
          }),
        ],
      });
      return;
    }

    const mod = guildMemberHas(message, PermissionFlagsBits.ManageGuild);

    try {
      if (sub === "set") {
        const settings = await prisma.botGuildBirthdaySettings.findUnique({
          where: { guildId: guild.id },
        });
        if (settings?.locked && !mod) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Birthdays are **locked** here — only moderators can set them.",
              ),
            ],
          });
          return;
        }
        const dateStr = args[1];
        const md = dateStr ? parseMonthDay(dateStr) : null;
        if (!md) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Usage: **.birthday set** `MM-DD` or `DD-MM` (month first if ambiguous).",
              ),
            ],
          });
          return;
        }
        await prisma.botGuildMemberBirthday.upsert({
          where: {
            guildId_userId: { guildId: guild.id, userId: message.author.id },
          },
          create: {
            guildId: guild.id,
            userId: message.author.id,
            month: md.month,
            day: md.day,
            unlocked: true,
          },
          update: { month: md.month, day: md.day, unlocked: true },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Birthday saved",
              description: `${md.month}/${md.day}`,
            }),
          ],
        });
        return;
      }

      if (sub === "unlock") {
        await prisma.botGuildMemberBirthday.updateMany({
          where: { guildId: guild.id, userId: message.author.id },
          data: { unlocked: true },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Unlocked",
              description: "Your birthday will show in **.birthday list**.",
            }),
          ],
        });
        return;
      }

      if (sub === "list") {
        const rows = await prisma.botGuildMemberBirthday.findMany({
          where: { guildId: guild.id, unlocked: true },
          orderBy: [{ month: "asc" }, { day: "asc" }],
        });
        const lines: string[] = [];
        for (const r of rows.slice(0, 40)) {
          lines.push(
            `<@${r.userId}> — ${String(r.month).padStart(2, "0")}/${String(r.day).padStart(2, "0")}`,
          );
        }
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Birthdays",
              description:
                lines.length > 0 ? lines.join("\n") : "*No unlocked birthdays yet.*",
            }),
          ],
        });
        return;
      }

      if (sub === "config") {
        const s = await prisma.botGuildBirthdaySettings.findUnique({
          where: { guildId: guild.id },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Birthday config",
              description:
                `**Locked:** ${s?.locked ? "yes" : "no"}\n` +
                `**Announce channel:** ${s?.announceChannelId ? `<#${s.announceChannelId}>` : "—"}\n` +
                `**Role:** ${s?.roleId ? `<@&${s.roleId}>` : "—"}\n` +
                `**Celebrate role:** ${s?.celebrateRoleId ? `<@&${s.celebrateRoleId}>` : "—"}`,
            }),
          ],
        });
        return;
      }

      if (!mod) {
        await message.reply({
          embeds: [
            errorEmbed(
              "That **.birthday** subcommand needs **Manage Server**.",
            ),
          ],
        });
        return;
      }

      if (sub === "lock") {
        await prisma.botGuildBirthdaySettings.upsert({
          where: { guildId: guild.id },
          create: { guildId: guild.id, locked: true },
          update: { locked: true },
        });
        await message.reply({
          embeds: [minimalEmbed({ title: "Locked", description: "Members cannot self-set birthdays." })],
        });
        return;
      }

      if (sub === "channel") {
        const ch = message.mentions.channels.first();
        if (!ch || !("guildId" in ch) || ch.guildId !== guild.id) {
          await message.reply({
            embeds: [errorEmbed("Mention a **#channel** in this server.")],
          });
          return;
        }
        await prisma.botGuildBirthdaySettings.upsert({
          where: { guildId: guild.id },
          create: { guildId: guild.id, announceChannelId: ch.id },
          update: { announceChannelId: ch.id },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Announce channel",
              description: `${ch.toString()} saved (hourly role gifting still runs).`,
            }),
          ],
        });
        return;
      }

      if (sub === "role") {
        const r = message.mentions.roles.first();
        if (!r || r.id === guild.id) {
          await message.reply({
            embeds: [errorEmbed("Mention a **role** to store as the birthday role.")],
          });
          return;
        }
        await prisma.botGuildBirthdaySettings.upsert({
          where: { guildId: guild.id },
          create: { guildId: guild.id, roleId: r.id },
          update: { roleId: r.id },
        });
        await message.reply({
          embeds: [minimalEmbed({ title: "Birthday role", description: r.toString() })],
        });
        return;
      }

      if (sub === "celebrate") {
        if (args[1]?.toLowerCase() === "list") {
          const now = new Date();
          const month = now.getUTCMonth() + 1;
          const day = now.getUTCDate();
          const rows = await prisma.botGuildMemberBirthday.findMany({
            where: { guildId: guild.id, month, day, unlocked: true },
          });
          const lines = rows.map((r) => `<@${r.userId}>`);
          await message.reply({
            embeds: [
              minimalEmbed({
                title: "Birthdays today (UTC)",
                description:
                  lines.length > 0 ? lines.join(", ") : "*None on file.*",
              }),
            ],
          });
          return;
        }

        const r = message.mentions.roles.first();
        if (!r || r.id === guild.id) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Usage: **.birthday celebrate** `@role` or **.birthday celebrate list**.",
              ),
            ],
          });
          return;
        }
        await prisma.botGuildBirthdaySettings.upsert({
          where: { guildId: guild.id },
          create: { guildId: guild.id, celebrateRoleId: r.id },
          update: { celebrateRoleId: r.id },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Celebrate role",
              description: `${r.toString()} will be assigned on matching UTC days.`,
            }),
          ],
        });
        return;
      }
    } catch (e) {
      await message.reply({
        embeds: [errorEmbed(`Birthday command failed: ${String(e)}`)],
      });
      return;
    }

    await message.reply({
      embeds: [
        errorEmbed("Unknown subcommand — try **.birthday help** or **.birthday set**."),
      ],
    });
  },
};
