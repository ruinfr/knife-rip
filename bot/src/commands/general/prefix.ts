import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { PREFIX } from "../../config";
import { errorEmbed, minimalEmbed, missingPermissionEmbed } from "../../lib/embeds";
import {
  formatAllowedPrefixList,
  getGuildCommandPrefix,
  invalidateGuildPrefixCache,
  isAllowedCustomPrefix,
} from "../../lib/guild-prefix";
import { getBotPrisma } from "../../lib/db-prisma";
import { hasGuildPermission } from "../../lib/discord-member-perms";
import type { ArivixCommand } from "../types";

export const prefixCommand: ArivixCommand = {
  name: "prefix",
  aliases: ["setprefix"],
  description:
    "View or change Arivix’s command prefix (Manage Server only; allow-listed symbols)",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage:
      ".prefix / .setprefix — show · add <symbol> · remove (needs **Manage Server**)",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.prefix** in a server.")],
      });
      return;
    }

    const guildId = message.guild.id;

    if (!(await hasGuildPermission(message, PermissionFlagsBits.ManageGuild))) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Server")],
      });
      return;
    }

    const sub = args[0]?.toLowerCase();

    if (!sub) {
      const effective = await getGuildCommandPrefix(guildId);
      const isDefault = effective === PREFIX;
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Command prefix",
            description:
              `This server uses **\`${effective}\`**` +
              (isDefault ? " (default)." : ".") +
              `\n\nChange: **\`${effective}prefix add <…>\`** · reset: **\`${effective}prefix remove\`**\n` +
              `Allowed: ${formatAllowedPrefixList()}`,
          }),
        ],
      });
      return;
    }

    if (sub === "remove") {
      if (args.length > 1) {
        await message.reply({
          embeds: [
            errorEmbed("Usage: **`.prefix remove`** — no extra arguments."),
          ],
        });
        return;
      }
      try {
        const prisma = getBotPrisma();
        const del = await prisma.botGuildSettings.deleteMany({
          where: { guildId },
        });
        invalidateGuildPrefixCache(guildId);
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Prefix reset",
              description:
                del.count > 0
                  ? `Back to the default **\`${PREFIX}\`** prefix.`
                  : `Already on the default **\`${PREFIX}\`** prefix.`,
            }),
          ],
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await message.reply({
          embeds: [
            errorEmbed(
              `Database error — is **DATABASE_URL** set for the bot? ${msg.slice(0, 200)}`,
            ),
          ],
        });
      }
      return;
    }

    if (sub === "add") {
      const raw = args.slice(1).join(" ").trim();
      if (!raw) {
        await message.reply({
          embeds: [
            errorEmbed(
              `Usage: **\`prefix add\`** <prefix>\nAllowed: ${formatAllowedPrefixList()}`,
            ),
          ],
        });
        return;
      }
      if (!isAllowedCustomPrefix(raw)) {
        await message.reply({
          embeds: [
            errorEmbed(
              `That prefix isn’t allowed. Pick one of: ${formatAllowedPrefixList()}`,
            ),
          ],
        });
        return;
      }

      try {
        const prisma = getBotPrisma();
        await prisma.botGuildSettings.upsert({
          where: { guildId },
          create: { guildId, commandPrefix: raw },
          update: { commandPrefix: raw },
        });
        invalidateGuildPrefixCache(guildId);
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Prefix updated",
              description:
                `Commands in this server now use **\`${raw}\`** (e.g. **\`${raw}help\`**).`,
            }),
          ],
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await message.reply({
          embeds: [
            errorEmbed(
              `Database error — is **DATABASE_URL** set for the bot? ${msg.slice(0, 200)}`,
            ),
          ],
        });
      }
      return;
    }

    await message.reply({
      embeds: [
        errorEmbed(
          `Unknown subcommand. Try **\`prefix\`**, **\`prefix add …\`**, or **\`prefix remove\`**.\n` +
            `Allowed prefixes: ${formatAllowedPrefixList()}`,
        ),
      ],
    });
  },
};
