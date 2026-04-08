import { AttachmentBuilder, PermissionFlagsBits } from "discord.js";
import sharp from "sharp";
import { guildMemberHas } from "../../lib/command-perms";
import { errorEmbed } from "../../lib/embeds";
import { fetchImageBuffer } from "../../lib/fetch-image-buffer";
import { resolveMediaUrlFromCommand } from "../../lib/resolve-media-url";
import type { KnifeCommand } from "../types";

export const invertCommand: KnifeCommand = {
  name: "invert",
  aliases: ["negative"],
  description: "Invert image colors (needs Attach Files)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Image tools.",
    usage: ".invert [url] or attach",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!guildMemberHas(message, PermissionFlagsBits.AttachFiles)) {
      await message.reply({
        embeds: [
          errorEmbed("You need **Attach Files** in this channel to use **.invert**."),
        ],
      });
      return;
    }

    const media = resolveMediaUrlFromCommand(message, args);
    if (!media?.url) {
      await message.reply({
        embeds: [
          errorEmbed("Attach an **image** or pass an **https image URL**."),
        ],
      });
      return;
    }

    let buf: Buffer;
    try {
      buf = await fetchImageBuffer(media.url);
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not download that image.")],
      });
      return;
    }

    let out: Buffer;
    try {
      out = await sharp(buf).negate().png().toBuffer();
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not process that image.")],
      });
      return;
    }

    const file = new AttachmentBuilder(out, { name: "inverted.png" });
    await message.reply({ files: [file] });
  },
};
