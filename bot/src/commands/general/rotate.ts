import { AttachmentBuilder, PermissionFlagsBits } from "discord.js";
import sharp from "sharp";
import { guildMemberHas } from "../../lib/command-perms";
import { errorEmbed } from "../../lib/embeds";
import { fetchImageBuffer } from "../../lib/fetch-image-buffer";
import { resolveMediaUrlFromCommand } from "../../lib/resolve-media-url";
import type { KnifeCommand } from "../types";

export const rotateCommand: KnifeCommand = {
  name: "rotate",
  aliases: ["imgrotate"],
  description: "Rotate an image by degrees (needs Attach Files)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Image tools.",
    usage: ".rotate <degrees> [url] or attach image",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!guildMemberHas(message, PermissionFlagsBits.AttachFiles)) {
      await message.reply({
        embeds: [
          errorEmbed("You need **Attach Files** in this channel to use **.rotate**."),
        ],
      });
      return;
    }

    const nums = args.map((a) => Number(a)).filter((n) => !Number.isNaN(n));
    const deg = nums[0];
    if (deg === undefined) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **.rotate** `90` `[image url]` or attach an image."),
        ],
      });
      return;
    }

    const restArgs = args.filter((a) => !/^-?\d+(\.\d+)?$/.test(a));
    const media = resolveMediaUrlFromCommand(message, restArgs);
    if (!media?.url) {
      await message.reply({
        embeds: [
          errorEmbed("Attach an **image** or pass an **https image URL** after the angle."),
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
      out = await sharp(buf).rotate(deg).png().toBuffer();
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not rotate that image.")],
      });
      return;
    }

    const file = new AttachmentBuilder(out, { name: "rotated.png" });
    await message.reply({ files: [file] });
  },
};
