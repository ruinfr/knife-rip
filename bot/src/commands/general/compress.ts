import { AttachmentBuilder, PermissionFlagsBits } from "discord.js";
import sharp from "sharp";
import { guildMemberHas } from "../../lib/command-perms";
import { errorEmbed } from "../../lib/embeds";
import { fetchImageBuffer } from "../../lib/fetch-image-buffer";
import { resolveMediaUrlFromCommand } from "../../lib/resolve-media-url";
import type { KnifeCommand } from "../types";

export const compressCommand: KnifeCommand = {
  name: "compress",
  aliases: ["jpeg", "squish"],
  description: "Compress image to JPEG (quality / ratio 1–100 or 0–1)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Image tools.",
    usage: ".compress <quality> [url] or attach",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!guildMemberHas(message, PermissionFlagsBits.AttachFiles)) {
      await message.reply({
        embeds: [
          errorEmbed("You need **Attach Files** in this channel to use **.compress**."),
        ],
      });
      return;
    }

    const rawQ = args[0];
    let q = Number(rawQ);
    if (Number.isNaN(q)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.compress** `quality` `[url]` — quality 1–100 (percent) or 0.1–1 for JPEG.",
          ),
        ],
      });
      return;
    }
    if (q > 0 && q <= 1) q = Math.round(q * 100);
    q = Math.min(100, Math.max(1, Math.round(q)));

    const rest = args.slice(1);
    const media = resolveMediaUrlFromCommand(message, rest);
    if (!media?.url) {
      await message.reply({
        embeds: [
          errorEmbed("Attach an **image** or pass a **URL** after the quality value."),
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
      out = await sharp(buf).jpeg({ quality: q, mozjpeg: true }).toBuffer();
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not compress that image.")],
      });
      return;
    }

    const file = new AttachmentBuilder(out, { name: `compressed-q${q}.jpg` });
    await message.reply({ files: [file] });
  },
};
