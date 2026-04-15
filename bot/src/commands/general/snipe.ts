import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { getSiteApiBase } from "../../config";
import { guildMemberHas } from "../../lib/command-perms";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { parseDiscordMessageUrl } from "../../lib/parse-discord-message-url";
import {
  SNIPE_TTL_MS,
  clearChannelSnipes,
  getDeleteSnipe,
  getEditSnipe,
  getReactionHistory,
  getReactionSnipe,
} from "../../lib/snipe/store";
import type { KnifeCommand } from "../types";

const DESC_MAX = 3800;

function relTs(ms: number): string {
  return `<t:${Math.floor(ms / 1000)}:R>`;
}

function clipText(s: string, max = 1000): string {
  const t = s.trim();
  if (!t) return "*[empty]*";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function footer(): string {
  return `Snipes expire after ${SNIPE_TTL_MS / 60000} minutes · Bots ignored · Not stored on disk`;
}

export const snipeCommand: KnifeCommand = {
  name: "snipe",
  aliases: ["s"],
  description: "Show the last deleted message in this channel (if the bot saw it)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".snipe · .s",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.snipe** in a server channel.")],
      });
      return;
    }

    const data = getDeleteSnipe(message.channel.id);
    if (!data) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Nothing to snipe — no recent deletes here, or the bot didn’t cache that message.",
          ),
        ],
      });
      return;
    }

    const attach =
      data.attachmentCount > 0
        ? `\n**Attachments:** ${data.attachmentCount} (not shown)`
        : "";

    const desc = (
      `**Author:** ${data.authorTag} (<@${data.authorId}>)\n` +
      `**Deleted** ${relTs(data.at)}\n\n` +
      `${clipText(data.content, 1800)}${attach}`
    ).slice(0, DESC_MAX);

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Last deleted message")
          .setDescription(desc)
          .setColor(0x2b2d31)
          .setFooter({ text: footer() }),
      ],
    });
  },
};

export const esnipeCommand: KnifeCommand = {
  name: "esnipe",
  aliases: ["es", "editsnipe"],
  description: "Show the last edited message (before → after) in this channel",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".esnipe · .es · .editsnipe",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.esnipe** in a server channel.")],
      });
      return;
    }

    const data = getEditSnipe(message.channel.id);
    if (!data) {
      await message.reply({
        embeds: [errorEmbed("Nothing to esnipe — no recent edits recorded here.")],
      });
      return;
    }

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Last edited message")
          .setDescription(
            `**Author:** ${data.authorTag} (<@${data.authorId}>)\n` +
              `**Message ID:** \`${data.messageId}\` · **Edited** ${relTs(data.at)}`,
          )
          .addFields(
            {
              name: "Before",
              value: clipText(data.before, 1024),
            },
            {
              name: "After",
              value: clipText(data.after, 1024),
            },
          )
          .setColor(0x2b2d31)
          .setFooter({ text: footer() }),
      ],
    });
  },
};

export const rsnipeCommand: KnifeCommand = {
  name: "rsnipe",
  aliases: ["rs", "reactionsnipe"],
  description: "Show the last reaction removed in this channel (emoji + who removed it)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".rsnipe · .rs · .reactionsnipe",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.rsnipe** in a server channel.")],
      });
      return;
    }

    const data = getReactionSnipe(message.channel.id);
    if (!data) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Nothing to rsnipe — no reaction removals recorded (enable **Message Content** + **Message Reactions** intent if missing).",
          ),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Last reaction removed")
          .setDescription(
            `**Emoji:** ${data.emojiDisplay}\n` +
              `**Removed by:** ${data.removerTag} (<@${data.removerId}>)\n` +
              `**Message author:** ${data.messageAuthorTag}\n` +
              `**Message ID:** \`${data.messageId}\`\n` +
              `**When:** ${relTs(data.at)}`,
          )
          .setColor(0x2b2d31)
          .setFooter({ text: footer() }),
      ],
    });
  },
};

export const clearsnipeCommand: KnifeCommand = {
  name: "clearsnipe",
  aliases: ["clearsnipes", "snipeclear", "csnipe", "cs"],
  description:
    "Clear snipe buffers in **this channel** (last delete, edit, reaction removal, and per-message reaction log)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Snipe and moderation tools.",
    usage: ".clearsnipe · .cs · .clearsnipes · .csnipe",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.clearsnipe** in a server channel.")],
      });
      return;
    }
    if (!guildMemberHas(message, PermissionFlagsBits.ManageMessages)) {
      await message.reply({
        embeds: [
          errorEmbed("You need **Manage Messages** to clear snipes here."),
        ],
      });
      return;
    }

    clearChannelSnipes(message.channel.id);
    const origin = getSiteApiBase();
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Snipes cleared",
          description:
            `Removed cached **delete**, **edit**, and **reaction** snipes for ${message.channel.toString()}, plus **reaction history** for messages in this channel.\n` +
            `More: [commands](${origin}/commands)`,
        }),
      ],
    });
  },
};

export const reactionhistoryCommand: KnifeCommand = {
  name: "reactionhistory",
  aliases: ["rh", "reacthistory", "reactionlog"],
  description:
    "Recent reaction **add/remove** events Arivix logged for a message (in-memory, same window as snipes)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Snipe and moderation tools.",
    usage: ".reactionhistory <message jump link>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.reactionhistory** in a server.")],
      });
      return;
    }
    if (!guildMemberHas(message, PermissionFlagsBits.ManageMessages)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "You need **Manage Messages** to view reaction history.",
          ),
        ],
      });
      return;
    }

    const raw = args.join(" ").trim();
    const parsed = parseDiscordMessageUrl(raw);
    if (!parsed || parsed.guildId !== message.guild.id) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Paste a **jump link** to a message in **this server** (`https://discord.com/channels/...`).",
          ),
        ],
      });
      return;
    }

    const hist = getReactionHistory(parsed.channelId, parsed.messageId);
    if (hist.length === 0) {
      await message.reply({
        embeds: [
          errorEmbed(
            `No reaction events recorded for that message in the last **${SNIPE_TTL_MS / 60000}** minutes (bot must see adds/removals; messages from bots are skipped).`,
          ),
        ],
      });
      return;
    }

    const lines = [...hist]
      .reverse()
      .map(
        (e) =>
          `${e.type === "add" ? "**+**" : "**−**"} ${e.emojiDisplay} — ${e.userTag} (<@${e.userId}>) · ${relTs(e.at)}`,
      );

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Reaction history")
          .setDescription(
            `Message [\`${parsed.messageId}\`](https://discord.com/channels/${parsed.guildId}/${parsed.channelId}/${parsed.messageId})\n\n${lines.join("\n").slice(0, 3800)}`,
          )
          .setColor(0x2b2d31)
          .setFooter({
            text: `Newest at top · ${footer()}`,
          }),
      ],
    });
  },
};
