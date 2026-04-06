import { EmbedBuilder } from "discord.js";

/** Neutral embeds — no strong brand colors. */
export function minimalEmbed(params: {
  title: string;
  description: string;
  /** Large image below the body */
  imageUrl?: string;
  /** Small image in the top-right (e.g. avatar / server icon) */
  thumbnailUrl?: string;
  /** Footer (e.g. join hub when role sync skipped — keep short; Discord max 2048). */
  footerText?: string;
}): EmbedBuilder {
  const b = new EmbedBuilder()
    .setTitle(params.title)
    .setDescription(params.description)
    .setColor(0x2b2d31);
  if (params.thumbnailUrl) {
    b.setThumbnail(params.thumbnailUrl);
  }
  if (params.imageUrl) {
    b.setImage(params.imageUrl);
  }
  if (params.footerText) {
    b.setFooter({
      text: params.footerText.slice(0, 2048),
    });
  }
  return b;
}

export function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("Something went wrong")
    .setDescription(description)
    .setColor(0xed4245);
}
