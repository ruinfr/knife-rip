import { randomBytes } from "node:crypto";
import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import { buildPollEmbed, buildPollRows } from "../../lib/poll/render";
import {
  getPollByMessageId,
  registerPollState,
  type PollState,
} from "../../lib/poll/state";
import type { ArivixCommand } from "../types";

async function handlePollEnd(message: Message, args: string[]): Promise<void> {
  if (!message.guild) {
    await message.reply({
      embeds: [errorEmbed("Use this in a server.")],
    });
    return;
  }

  let targetId = args[1]?.trim();
  if (!targetId && message.reference?.messageId) {
    targetId = message.reference.messageId;
  }
  if (!targetId) {
    await message.reply({
      embeds: [
        errorEmbed(
          "Usage: **`.poll end <messageId>`** or **reply** to the poll with **`.poll end`**. Copy ID: message ⋮ → Copy ID.",
        ),
      ],
    });
    return;
  }

  const state = getPollByMessageId(targetId);
  if (!state || state.guildId !== message.guild.id) {
    await message.reply({
      embeds: [
        errorEmbed(
          "Unknown poll — wrong server or that message isn’t an active Arivix poll.",
        ),
      ],
    });
    return;
  }

  const canManage =
    message.member?.permissions?.has?.(PermissionFlagsBits.ManageMessages) ??
    false;
  if (state.authorId !== message.author.id && !canManage) {
    await message.reply({
      embeds: [
        errorEmbed(
          "Only the **poll creator** or someone with **Manage Messages** can close it.",
        ),
      ],
    });
    return;
  }

  if (state.closed) {
    await message.reply({ content: "That poll is already closed." });
    return;
  }

  const ch = await message.client.channels.fetch(state.channelId);
  if (!ch?.isTextBased()) {
    await message.reply({
      embeds: [errorEmbed("Could not load the poll channel.")],
    });
    return;
  }

  let pollMsg;
  try {
    pollMsg = await ch.messages.fetch(state.messageId);
  } catch {
    await message.reply({
      embeds: [
        errorEmbed(
          "Could not load the poll message — it may have been deleted.",
        ),
      ],
    });
    return;
  }

  state.closed = true;
  await pollMsg.edit({
    embeds: [buildPollEmbed(state, true)],
    components: buildPollRows(state, true),
  });
  await pollMsg.pin().catch(() => {});

  await message.reply({
    content:
      "Poll **closed**. Results are on the original message (pinned if the bot can).",
    allowedMentions: { parse: [] },
  });
}

export const pollCommand: ArivixCommand = {
  name: "poll",
  aliases: ["vote"],
  description:
    "Button poll — choices separated by | — or Yes/No; end early with end + message id (or reply)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage:
      ".poll · .vote — question | A | B | … · .poll end [id] · reply + .poll end",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("Polls only work in servers.")],
      });
      return;
    }

    if (args[0]?.toLowerCase() === "end") {
      await handlePollEnd(message, args);
      return;
    }

    const joined = args.join(" ").trim();
    if (!joined) {
      await message.reply({
        embeds: [
          errorEmbed(
            "**Create:** `.poll Pizza for lunch? | pizzas | salads` or `.poll Skip movie night?` (Yes/No).\n**Close:** `.poll end <id>` or reply to the poll with `.poll end`.",
          ),
        ],
      });
      return;
    }

    const segments = joined
      .split(/\s*\|\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    let question: string;
    let options: string[];

    if (segments.length === 1) {
      question = segments[0]!;
      options = ["Yes", "No"];
    } else if (segments.length >= 3) {
      question = segments[0]!;
      options = segments.slice(1);
      if (options.length > 5) {
        await message.reply({
          embeds: [errorEmbed("Maximum **5** options after the question.")],
        });
        return;
      }
      if (options.length < 2) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Need at least **two** choices after `|`, or use `.poll question` for Yes/No.",
            ),
          ],
        });
        return;
      }
    } else {
      await message.reply({
        embeds: [
          errorEmbed(
            "Use **`.poll question | A | B`** or **`.poll question`** for Yes/No.",
          ),
        ],
      });
      return;
    }

    const ch = message.channel;
    if (!ch.isTextBased() || ch.isDMBased()) {
      await message.reply({
        embeds: [errorEmbed("Run this in a server text channel.")],
      });
      return;
    }

    const pollId = randomBytes(4).toString("hex");
    const state: PollState = {
      pollId,
      messageId: "",
      channelId: ch.id,
      guildId: message.guild.id,
      authorId: message.author.id,
      question,
      options,
      votes: new Map(),
      closed: false,
    };

    const sent = await ch.send({
      embeds: [buildPollEmbed(state, false)],
      components: buildPollRows(state, false),
    });

    state.messageId = sent.id;
    registerPollState(state);

    await sent.edit({
      embeds: [
        buildPollEmbed(state, false).setFooter({
          text: `Close: .poll end ${sent.id} — or reply to this message with .poll end`,
        }),
      ],
      components: buildPollRows(state, false),
    });
  },
};
