import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import {
  actionableErrorEmbed,
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import type { KnifeCommand } from "../types";

async function requireManageChannels(message: Message) {
  const g = message.guild;
  if (!g) return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return missingPermissionEmbed("you", "Manage Channels");
  }
  return null;
}

function channelSupportsOverwrites(
  ch: Message["channel"] | { isDMBased(): boolean; id: string } | null,
): ch is Exclude<Message["channel"], { isDMBased(): true }> & {
  permissionOverwrites: {
    edit: (
      id: string,
      perm: { SendMessages?: boolean | null },
      opts: { reason?: string },
    ) => Promise<unknown>;
  };
} {
  if (!ch || ch.isDMBased()) return false;
  return (
    "permissionOverwrites" in ch &&
    typeof ch.permissionOverwrites?.edit === "function"
  );
}

export const lockCommand: KnifeCommand = {
  name: "lock",
  aliases: ["chanlock", "lockchan"],
  description:
    "Stop @everyone from sending messages in this channel (overwrite)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".lock [#channel] [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageChannels(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const guild = message.guild!;
    let ch: Message["channel"] | Awaited<ReturnType<typeof guild.channels.fetch>> =
      message.channel;
    const raw = args[0]?.trim();
    const chId =
      raw?.match(/^<#(\d+)>$/)?.[1] ??
      (raw && /^\d{17,20}$/.test(raw) ? raw : null);
    const reasonRest = chId ? args.slice(1).join(" ").trim() : "";
    if (chId) {
      const fetched = await guild.channels.fetch(chId).catch(() => null);
      if (fetched && channelSupportsOverwrites(fetched)) {
        ch = fetched;
      } else {
        await message.reply({
          embeds: [errorEmbed("Could not use that channel for lock.")],
        });
        return;
      }
    }
    if (!channelSupportsOverwrites(ch)) {
      await message.reply({
        embeds: [
          errorEmbed("Locks aren’t supported in this channel type."),
        ],
      });
      return;
    }

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply({
        embeds: [missingPermissionEmbed("bot", "Manage Channels")],
      });
      return;
    }

    const lockReason =
      reasonRest.slice(0, 400) || `Channel locked — ${message.author.tag}`;
    try {
      await ch.permissionOverwrites.edit(
        guild.roles.everyone.id,
        { SendMessages: false },
        { reason: lockReason },
      );
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Couldn't lock",
            body: "Discord blocked the overwrite — check my **Manage Channels** permission and role order.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Locked",
          description:
            "**@everyone** can’t send messages here (until **.unlock**). Mod roles with **Send Messages** may still post depending on your setup.",
        }),
      ],
    });
  },
};

export const unlockCommand: KnifeCommand = {
  name: "unlock",
  aliases: ["unlockchan", "unlockc"],
  description: "Clear the @everyone send lock for this channel (inherit again)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".unlock [#channel] [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageChannels(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const guild = message.guild!;
    let ch: Message["channel"] | Awaited<ReturnType<typeof guild.channels.fetch>> =
      message.channel;
    const raw = args[0]?.trim();
    const chId =
      raw?.match(/^<#(\d+)>$/)?.[1] ??
      (raw && /^\d{17,20}$/.test(raw) ? raw : null);
    const reasonRest = chId ? args.slice(1).join(" ").trim() : "";
    if (chId) {
      const fetched = await guild.channels.fetch(chId).catch(() => null);
      if (fetched && channelSupportsOverwrites(fetched)) {
        ch = fetched;
      } else {
        await message.reply({
          embeds: [errorEmbed("Could not use that channel for unlock.")],
        });
        return;
      }
    }
    if (!channelSupportsOverwrites(ch)) {
      await message.reply({
        embeds: [
          errorEmbed("Unlock isn’t supported in this channel type."),
        ],
      });
      return;
    }

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply({
        embeds: [missingPermissionEmbed("bot", "Manage Channels")],
      });
      return;
    }

    const unlockReason =
      reasonRest.slice(0, 400) || `Channel unlocked — ${message.author.tag}`;
    try {
      await ch.permissionOverwrites.edit(
        guild.roles.everyone.id,
        { SendMessages: null },
        { reason: unlockReason },
      );
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Couldn't unlock",
            body: "Discord blocked the change — check my **Manage Channels** permission and role order.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Unlocked",
          description:
            "**@everyone** send permission is **reset** to inherit (usually open).",
        }),
      ],
    });
  },
};
