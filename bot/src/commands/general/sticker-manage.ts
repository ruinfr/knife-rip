import { PermissionFlagsBits } from "discord.js";
import { guildMemberHas } from "../../lib/command-perms";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { fetchImageBuffer } from "../../lib/fetch-image-buffer";
import type { ArivixCommand } from "../types";

function modSticker(message: import("discord.js").Message): boolean {
  return (
    guildMemberHas(message, PermissionFlagsBits.ManageGuildExpressions) ||
    guildMemberHas(message, PermissionFlagsBits.ManageGuild)
  );
}

function slugStickerName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 30) || "sticker";
}

export const stickerCommand: ArivixCommand = {
  name: "sticker",
  aliases: ["stickers"],
  description: "Manage server stickers (tag, add, remove, rename, cleanup)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Expressions.",
    usage:
      ".sticker add <url> <name> · .sticker remove <name> · .sticker rename <new> (with sticker)",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.sticker** in a server.")],
      });
      return;
    }

    const sub = args[0]?.toLowerCase();
    if (!sub || sub === "help") {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Sticker management",
            description:
              "**`.sticker add`** `image_url` `name` — add from URL\n" +
              "**`.sticker remove`** `name`\n" +
              "**`.sticker rename`** `new_name` — use with a **sticker** on your message\n" +
              "**`.sticker cleanup`** — normalize stored names (mods)\n" +
              "**`.sticker tag`** — set suggestion tags from vanity code / guild name (mods)",
          }),
        ],
      });
      return;
    }

    await guild.stickers.fetch().catch(() => {});

    if (sub === "add") {
      if (!modSticker(message)) {
        await message.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Expressions** (and the bot needs it too).",
            ),
          ],
        });
        return;
      }
      const url = args[1];
      const nameRaw = args.slice(2).join(" ").trim();
      if (!url || !/^https?:\/\//i.test(url) || !nameRaw) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Usage: **.sticker add** `https://…` `Sticker_Name` (PNG/APNG, under server limit).",
            ),
          ],
        });
        return;
      }
      const name = slugStickerName(nameRaw);
      let buf: Buffer;
      try {
        buf = await fetchImageBuffer(url);
      } catch {
        await message.reply({
          embeds: [errorEmbed("Could not download that URL.")],
        });
        return;
      }
      try {
        await guild.stickers.create({
          file: buf,
          name,
          tags: name.slice(0, 20),
        });
      } catch {
        await message.reply({
          embeds: [
            errorEmbed(
              "Sticker create failed — check file type, size, and sticker slots.",
            ),
          ],
        });
        return;
      }
      await message.reply({
        embeds: [
          minimalEmbed({ title: "Sticker added", description: `\`${name}\`` }),
        ],
      });
      return;
    }

    if (sub === "remove") {
      if (!modSticker(message)) {
        await message.reply({
          embeds: [
            errorEmbed("You need **Manage Expressions** to remove stickers."),
          ],
        });
        return;
      }
      const q = args.slice(1).join(" ").trim().toLowerCase();
      if (!q) {
        await message.reply({
          embeds: [errorEmbed("Usage: **.sticker remove** `name`")],
        });
        return;
      }
      const match = [...guild.stickers.cache.values()].find(
        (s) => s.name.toLowerCase() === q,
      );
      if (!match) {
        await message.reply({
          embeds: [errorEmbed("No sticker with that exact name.")],
        });
        return;
      }
      await guild.stickers.delete(match.id).catch(() => {});
      await message.reply({
        embeds: [
          minimalEmbed({ title: "Removed", description: `\`${match.name}\`` }),
        ],
      });
      return;
    }

    if (sub === "rename") {
      if (!modSticker(message)) {
        await message.reply({
          embeds: [
            errorEmbed("You need **Manage Expressions** to rename stickers."),
          ],
        });
        return;
      }
      const newName = slugStickerName(args.slice(1).join(" "));
      if (!newName) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Send a **sticker** with your message, then: **.sticker rename** `New_Name`",
            ),
          ],
        });
        return;
      }
      const st = message.stickers.first();
      if (!st?.guildId || st.guildId !== guild.id) {
        await message.reply({
          embeds: [
            errorEmbed(
              "You must **attach a server sticker** from this guild to the same message.",
            ),
          ],
        });
        return;
      }
      await guild.stickers.edit(st.id, { name: newName }).catch(() => {
        void 0;
      });
      await message.reply({
        embeds: [
          minimalEmbed({ title: "Renamed", description: `\`${newName}\`` }),
        ],
      });
      return;
    }

    if (sub === "cleanup") {
      if (!modSticker(message)) {
        await message.reply({
          embeds: [
            errorEmbed("You need **Manage Expressions** to clean sticker names."),
          ],
        });
        return;
      }
      let n = 0;
      for (const st of guild.stickers.cache.values()) {
        const next = slugStickerName(st.name);
        if (next !== st.name) {
          await guild.stickers.edit(st.id, { name: next }).catch(() => {});
          n += 1;
        }
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Sticker cleanup",
            description: `Normalized **${n}** sticker name(s).`,
          }),
        ],
      });
      return;
    }

    if (sub === "tag") {
      if (!modSticker(message)) {
        await message.reply({
          embeds: [
            errorEmbed("You need **Manage Guild** / **Expressions** for bulk tag edits."),
          ],
        });
        return;
      }
      const g = await guild.fetch().catch(() => guild);
      const tagBase = (g.vanityURLCode ?? g.name).slice(0, 20);
      let n = 0;
      for (const st of guild.stickers.cache.values()) {
        await guild.stickers
          .edit(st.id, { tags: `${tagBase},${st.name}`.slice(0, 200) })
          .catch(() => {});
        n += 1;
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Sticker tags",
            description: `Updated **${n}** sticker tag fields with base \`${tagBase}\`.`,
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [errorEmbed("Unknown **.sticker** subcommand — try **.sticker help**.")],
    });
  },
};
