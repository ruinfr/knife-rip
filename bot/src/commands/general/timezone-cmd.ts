import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import type { ArivixCommand } from "../types";

export const timezoneCommand: ArivixCommand = {
  name: "timezone",
  aliases: ["tz"],
  description: "Per-user IANA timezone (subs: set, list)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Community.",
    usage: ".timezone · .timezone set America/New_York · .timezone list",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    let prisma;
    try {
      prisma = getBotPrisma();
    } catch {
      await message.reply({ embeds: [errorEmbed("Database unavailable.")] });
      return;
    }

    const sub = args[0]?.toLowerCase();

    if (sub === "set") {
      const iana = args.slice(1).join(" ").trim();
      if (!iana) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Usage: **.timezone set** `Region/City` — see IANA tz database names.",
            ),
          ],
        });
        return;
      }
      try {
        Intl.DateTimeFormat(undefined, { timeZone: iana });
      } catch {
        await message.reply({
          embeds: [
            errorEmbed(
              "That does not look like a valid **IANA** timezone (example: `America/New_York`).",
            ),
          ],
        });
        return;
      }
      await prisma.botUserTimezone.upsert({
        where: { userId: message.author.id },
        create: { userId: message.author.id, iana },
        update: { iana },
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Timezone saved",
            description: `\`${iana}\``,
          }),
        ],
      });
      return;
    }

    if (sub === "list") {
      const guild = message.guild;
      if (!guild) {
        await message.reply({
          embeds: [errorEmbed("Use **.timezone list** in a server.")],
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
      const ids = [...guild.members.cache.keys()];
      const rows = await prisma.botUserTimezone.findMany({
        where: { userId: { in: ids } },
      });
      const lines: string[] = [];
      for (const r of rows.slice(0, 35)) {
        lines.push(`<@${r.userId}> — \`${r.iana}\``);
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Saved timezones (sample)",
            description:
              lines.length > 0 ? lines.join("\n") : "*Nobody in cache saved a timezone yet.*",
          }),
        ],
      });
      return;
    }

    const target = await resolveTargetUser(message, args);
    const row = await prisma.botUserTimezone.findUnique({
      where: { userId: target.id },
    });
    if (!row) {
      await message.reply({
        embeds: [
          errorEmbed(
            `${target.username} has no timezone — they can run **.timezone set**.`,
          ),
        ],
      });
      return;
    }

    let formatted: string;
    try {
      formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: row.iana,
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date());
    } catch {
      await message.reply({
        embeds: [errorEmbed("Stored timezone is invalid — reset with **.timezone set**.")],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `${target.username} — ${row.iana}`,
          description: formatted,
        }),
      ],
    });
  },
};
