import type { Message } from "discord.js";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { resolveGuildByInput } from "../../lib/resolve-guild-by-input";
import type { KnifeCommand } from "../types";

async function assetReply(
  message: Message,
  args: string[],
  kind: "icon" | "banner" | "splash",
): Promise<void> {
  const guild = await resolveGuildByInput(
    message.client,
    args[0],
    message.guild,
  );
  if (!guild) {
    await message.reply({
      embeds: [
        errorEmbed(
          "Use this in a server, or pass a **guild ID** the bot shares.",
        ),
      ],
    });
    return;
  }

  const g = await guild.fetch().catch(() => guild);

  let title: string;
  let url: string | null = null;

  if (kind === "icon") {
    title = `Guild icon — ${g.name}`;
    url = g.iconURL({ size: 512, extension: "png", forceStatic: false });
  } else if (kind === "banner") {
    title = `Guild banner — ${g.name}`;
    url = g.bannerURL({ size: 2048 });
  } else {
    title = `Invite splash — ${g.name}`;
    url = g.splashURL({ size: 2048 });
  }

  if (!url) {
    await message.reply({
      embeds: [
        errorEmbed(
          kind === "icon"
            ? "This server has **no icon**."
            : kind === "banner"
              ? "No **banner** (Boost Level 2+) on this server."
              : "No **invite splash** (Boost Level 1+) on this server.",
        ),
      ],
    });
    return;
  }

  await message.reply({
    embeds: [
      minimalEmbed({
        title,
        description: `**[Open full size](${url})**`,
        imageUrl: url,
      }),
    ],
  });
}

export const guildiconCommand: KnifeCommand = {
  name: "guildicon",
  aliases: ["gicon", "servericonid"],
  description: "Guild icon for this server or a guild ID the bot is in",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server assets.",
    usage: ".guildicon [guild ID]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    await assetReply(message, args, "icon");
  },
};

export const guildbannerCommand: KnifeCommand = {
  name: "guildbanner",
  aliases: ["gbanner"],
  description: "Guild banner (Boost L2+) for this server or a guild ID",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server assets.",
    usage: ".guildbanner [guild ID]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    await assetReply(message, args, "banner");
  },
};

export const splashCommand: KnifeCommand = {
  name: "splash",
  aliases: ["invitesplash", "guildsplash"],
  description: "Guild invite splash background",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Server assets.",
    usage: ".splash [guild ID]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    await assetReply(message, args, "splash");
  },
};
