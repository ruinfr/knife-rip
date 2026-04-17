import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import {
  actionableErrorEmbed,
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import {
  assertBotHierarchy,
  canPunish,
  resolveModerationMember,
} from "../../lib/moderation-target";
import type { ArivixCommand } from "../types";

async function requirePerm(message: Message) {
  const g = message.guild;
  if (!g) return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.KickMembers)) {
    return missingPermissionEmbed("you", "Kick Members");
  }
  return null;
}

export const kickCommand: ArivixCommand = {
  name: "kick",
  aliases: ["k"],
  description: "Remove a member from the server (needs Kick Members)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".kick @user [reason] · .k @user [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requirePerm(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }

    const { member: target, tailArgs } = resolved;
    const actor =
      message.member ??
      (await message.guild!.members.fetch(message.author.id));
    const v = canPunish(actor, target);
    if (v) {
      await message.reply({ embeds: [errorEmbed(v)] });
      return;
    }

    const me = message.guild!.members.me;
    if (!me) {
      await message.reply({ embeds: [errorEmbed("Could not load my member.")] });
      return;
    }
    const botChk = assertBotHierarchy(me, target);
    if (botChk) {
      await message.reply({ embeds: [errorEmbed(botChk)] });
      return;
    }
    if (!target.kickable) {
      await message.reply({
        embeds: [errorEmbed("I can’t kick that member (role hierarchy or owner).")],
      });
      return;
    }

    const reasonBase = tailArgs.join(" ").trim().slice(0, 450);
    const reason = reasonBase || `Kicked by ${message.author.tag}`;

    try {
      await target.kick(reason);
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Kick failed",
            body: "Discord blocked the kick — I need **Kick Members** and a higher role than the target.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Kicked",
          description: `**${target.user.tag}** was kicked.\n**Reason:** ${reason}`,
        }),
      ],
    });
  },
};
