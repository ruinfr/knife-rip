import { EmbedBuilder } from "discord.js";

/** On-site permission guide — matches site `/docs/permissions`. */
export const DOCS_PERMISSIONS_URL = `${(
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
  process.env.PUBLIC_SITE_ORIGIN?.trim().replace(/\/$/, "") ||
  "https://arivix.org"
)}/docs/permissions`;

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

export function errorEmbed(
  description: string,
  options?: { title?: string },
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(options?.title ?? "Something went wrong")
    .setDescription(description)
    .setColor(0xed4245);
}

/** Short, actionable copy with optional link to the permissions doc. */
export function actionableErrorEmbed(params: {
  body: string;
  title?: string;
  linkPermissionsDoc?: boolean;
}): EmbedBuilder {
  let description = params.body.trim();
  if (params.linkPermissionsDoc) {
    description += `\n\n[Permission guide](${DOCS_PERMISSIONS_URL})`;
  }
  return new EmbedBuilder()
    .setTitle(params.title ?? "Can't do that")
    .setDescription(description)
    .setColor(0xed4245);
}

export function missingPermissionEmbed(
  subject: "you" | "bot",
  permissionLabel: string,
): EmbedBuilder {
  const body =
    subject === "you"
      ? `**Missing:** ${permissionLabel}\nGive this permission to your role in this channel or server.`
      : `**I need:** ${permissionLabel}\nRaise Arivix's role if Discord is blocking the action.`;
  return actionableErrorEmbed({
    body,
    title: subject === "you" ? "Permission needed" : "Bot permission needed",
    linkPermissionsDoc: true,
  });
}
