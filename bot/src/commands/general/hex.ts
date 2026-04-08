import { EmbedBuilder } from "discord.js";
import sharp from "sharp";
import { errorEmbed } from "../../lib/embeds";
import { fetchImageBuffer } from "../../lib/fetch-image-buffer";
import {
  resolveAvatarUrlForHex,
  resolveMediaUrlFromCommand,
} from "../../lib/resolve-media-url";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import type { KnifeCommand } from "../types";

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

export const hexCommand: KnifeCommand = {
  name: "hex",
  aliases: ["color", "dominant"],
  description: "Dominant color from an image URL, attachment, or user avatar",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Image tools.",
    usage: ".hex <url | attachment | @user>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const media = resolveMediaUrlFromCommand(message, args);
    let url: string | null = media?.url ?? null;

    if (!url) {
      const mentionUser = await resolveTargetUser(message, args).catch(() => null);
      if (mentionUser && message.guild) {
        const mem = await message.guild.members
          .fetch(mentionUser.id)
          .catch(() => null);
        url =
          resolveAvatarUrlForHex(message, mem, mentionUser) ??
          mentionUser.displayAvatarURL({ size: 256, extension: "png" });
      } else if (mentionUser) {
        url = mentionUser.displayAvatarURL({ size: 256, extension: "png" });
      }
    }

    if (!url) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Provide an **image URL**, attach an image, or **mention a user**.",
          ),
        ],
      });
      return;
    }

    let buf: Buffer;
    try {
      buf = await fetchImageBuffer(url);
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not download that image.")],
      });
      return;
    }

    let r = 0;
    let g = 0;
    let b = 0;
    try {
      const { data, info } = await sharp(buf)
        .resize(1, 1, { fit: "fill" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      if (info.channels >= 3) {
        r = data[0];
        g = data[1];
        b = data[2];
      }
    } catch {
      await message.reply({
        embeds: [errorEmbed("Could not decode that image.")],
      });
      return;
    }

    const hex = rgbToHex(r, g, b);

    const embed = new EmbedBuilder()
      .setColor(parseInt(hex.slice(1), 16) || 0x2b2d31)
      .setTitle("Dominant color")
      .setDescription(
        `**${hex}** · RGB(${r}, ${g}, ${b})\n` + `[Source](${url})`,
      );

    await message.reply({ embeds: [embed] });
  },
};
