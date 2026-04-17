import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { guildMemberHas } from "../../lib/command-perms";
import { errorEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import type { ArivixCommand } from "../types";

export const seenCommand: ArivixCommand = {
  name: "seen",
  aliases: ["lastseen"],
  description: "Last time we saw a member send messages here (best-effort, requires DB)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Activity.",
    usage: ".seen [@member | ID]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (
      !guildMemberHas(message, PermissionFlagsBits.EmbedLinks) ||
      !guildMemberHas(message, PermissionFlagsBits.AttachFiles)
    ) {
      await message.reply({
        embeds: [
          errorEmbed(
            "You need **Embed Links** and **Attach Files** to use **.seen** here.",
          ),
        ],
      });
      return;
    }

    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.seen** in a server.")],
      });
      return;
    }

    const user = await resolveTargetUser(message, args);

    try {
      const prisma = getBotPrisma();
      const row = await prisma.botGuildUserLastSeen.findUnique({
        where: {
          guildId_userId: { guildId: guild.id, userId: user.id },
        },
      });

      if (!row) {
        await message.reply({
          embeds: [
            errorEmbed(
              "No record yet — visibility starts after the feature is active and the member chats.",
            ),
          ],
        });
        return;
      }

      const t = Math.floor(row.lastSeenAt.getTime() / 1000);
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle(`${user.tag}`)
            .setDescription(`Last seen <t:${t}:f> (<t:${t}:R>)`),
        ],
      });
    } catch {
      await message.reply({
        embeds: [
          errorEmbed("Database unavailable — **.seen** could not load data."),
        ],
      });
    }
  },
};
