import { PermissionFlagsBits } from "discord.js";
import {
  actionableErrorEmbed,
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import { resolveModerationMember } from "../../lib/moderation-target";
import type { KnifeCommand } from "../types";
import type { Message, ThreadChannel } from "discord.js";

async function requireThread(
  message: Message,
): Promise<ThreadChannel | null> {
  const ch = message.channel;
  if (!ch.isThread()) {
    await message.reply({
      embeds: [
        errorEmbed("Run this **inside** the thread or forum post."),
      ],
    });
    return null;
  }
  return ch;
}

export const threadCommand: KnifeCommand = {
  name: "thread",
  aliases: ["threadtool", "threading"],
  description:
    "Thread/forum tools — **Manage Threads** (use inside the thread)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage:
      ".thread lock|unlock|rename `<name>`|add|remove @user|watch|watchlist",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const g = message.guild;
    if (!g) {
      await message.reply({ embeds: [errorEmbed("Servers only.")] });
      return;
    }
    const mem =
      message.member ??
      (await g.members.fetch(message.author.id).catch(() => null));
    if (!mem?.permissions.has(PermissionFlagsBits.ManageThreads)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Threads")],
      });
      return;
    }

    const sub = args[0]?.toLowerCase();
    const th = await requireThread(message);
    if (!th) return;

    if (sub === "lock") {
      try {
        await th.setLocked(true, `${message.author.tag} locked`);
      } catch {
        await message.reply({
          embeds: [
            actionableErrorEmbed({
              title: "Failed",
              body: "Could not lock thread.",
            }),
          ],
        });
        return;
      }
      await message.reply({
        embeds: [minimalEmbed({ title: "Thread locked", description: th.toString() })],
      });
      return;
    }
    if (sub === "unlock") {
      try {
        await th.setLocked(false, `${message.author.tag} unlocked`);
      } catch {
        await message.reply({
          embeds: [actionableErrorEmbed({ title: "Failed", body: "Could not unlock." })],
        });
        return;
      }
      await message.reply({
        embeds: [minimalEmbed({ title: "Thread unlocked", description: th.toString() })],
      });
      return;
    }
    if (sub === "rename") {
      const name = args.slice(1).join(" ").trim().slice(0, 100);
      if (!name) {
        await message.reply({
          embeds: [errorEmbed("Usage: **.thread rename** `<new name>`")],
        });
        return;
      }
      try {
        await th.setName(name, `${message.author.tag} renamed`);
      } catch {
        await message.reply({ embeds: [errorEmbed("Rename failed.")] });
        return;
      }
      await message.reply({
        embeds: [minimalEmbed({ title: "Renamed", description: name })],
      });
      return;
    }
    if (sub === "add") {
      const res = await resolveModerationMember(message, args.slice(1));
      if (!res.ok) {
        await message.reply({ embeds: [res.embed] });
        return;
      }
      try {
        await th.members.add(res.member.id);
      } catch {
        await message.reply({ embeds: [errorEmbed("Could not add member.")] });
        return;
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Added",
            description: res.member.toString(),
          }),
        ],
      });
      return;
    }
    if (sub === "remove") {
      const res = await resolveModerationMember(message, args.slice(1));
      if (!res.ok) {
        await message.reply({ embeds: [res.embed] });
        return;
      }
      try {
        await th.members.remove(res.member.id);
      } catch {
        await message.reply({ embeds: [errorEmbed("Could not remove member.")] });
        return;
      }
      await message.reply({
        embeds: [
          minimalEmbed({ title: "Removed", description: res.member.toString() }),
        ],
      });
      return;
    }
    if (sub === "watch") {
      if (!mem.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await message.reply({
          embeds: [missingPermissionEmbed("you", "Manage Channels")],
        });
        return;
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Watch",
            description: "_Tip: add the bot to private threads via **thread add @Arivix**._",
          }),
        ],
      });
      return;
    }
    if (sub === "watchlist" || sub === "watch-list") {
      const members = await th.members.fetch().catch(() => null);
      const n = members?.size ?? 0;
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Thread participants",
            description: `**${n}** fetched (API limit may apply).`,
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        errorEmbed(
          "Subcommands: **lock**, **unlock**, **rename**, **add**, **remove**, **watch**, **watchlist**",
        ),
      ],
    });
  },
};
