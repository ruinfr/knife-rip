import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { invalidateGuildAccessCache } from "../../lib/guild-access";
import { getBotPrisma } from "../../lib/db-prisma";
import { isCommandOwnerBypass } from "../../lib/owner-bypass";
import type { KnifeCommand } from "../types";

function parseSnowflake(raw: string | undefined): string | null {
  const t = raw?.trim() ?? "";
  return /^\d{17,20}$/.test(t) ? t : null;
}

export const accessCommand: KnifeCommand = {
  name: "access",
  aliases: ["guildaccess", "botaccess"],
  description:
    "Bot owner only — `.access yes|no <guildId>` allow or deny the bot in a server",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".access yes <guildId> · .access no <guildId>",
    tier: "free",
    style: "prefix",
    developerOnly: true,
  },
  async run({ message, args }) {
    if (!(await isCommandOwnerBypass(message.author.id))) {
      await message.reply({
        embeds: [errorEmbed("**`.access`** is **bot owner** only.")],
      });
      return;
    }

    const verb = args[0]?.toLowerCase();
    const guildId = parseSnowflake(args[1]);
    if (!guildId || (verb !== "yes" && verb !== "no")) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **`.access yes`** `<guildId>` — allow Arivix in that server again.\n" +
              "**`.access no`** `<guildId>` — ignore that server (commands, panels, VoiceMaster).\n\n" +
              "Run from **DM** or another server if that guild is already blocked.",
          ),
        ],
      });
      return;
    }

    try {
      const prisma = getBotPrisma();

      if (verb === "no") {
        await prisma.botGuildDenylist.upsert({
          where: { guildId },
          create: {
            guildId,
            setByDiscordId: message.author.id,
          },
          update: { setByDiscordId: message.author.id },
        });
        invalidateGuildAccessCache(guildId);
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Guild blocked",
              description:
                `Arivix will **ignore** guild \`${guildId}\` (messages, interactions, voice events).\n` +
                `Unblock with **\`.access yes ${guildId}\`** from DM or another server.`,
            }),
          ],
        });
        return;
      }

      const del = await prisma.botGuildDenylist.deleteMany({
        where: { guildId },
      });
      invalidateGuildAccessCache(guildId);
      if (del.count === 0) {
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Access",
              description: `Guild \`${guildId}\` was **not** on the block list.`,
            }),
          ],
        });
        return;
      }

      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Guild allowed",
            description: `Arivix will work in \`${guildId}\` again (subject to Discord / invites).`,
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
  },
};
