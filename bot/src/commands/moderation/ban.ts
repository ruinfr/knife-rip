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
  parseBanOptions,
  resolveBanTarget,
} from "../../lib/moderation-target";
import { BotModCaseKind } from "@prisma/client";
import { createModCase } from "../../lib/mod-case/service";
import type { KnifeCommand } from "../types";

async function requireBanPerm(message: Message) {
  const g = message.guild;
  if (!g) return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.BanMembers)) {
    return missingPermissionEmbed("you", "Ban Members");
  }
  return null;
}

export const banCommand: KnifeCommand = {
  name: "ban",
  aliases: ["b"],
  description:
    "Ban a user by mention or ID; optional `0`–`7` days of message delete (first arg after user)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".ban @user [0-7] [reason] · .b 123456789012345678 1 spam",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireBanPerm(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const resolved = await resolveBanTarget(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }

    const { user: targetUser, member: targetMember, tailArgs } = resolved;
    const actor =
      message.member ??
      (await message.guild!.members.fetch(message.author.id));

    if (targetUser.id === actor.id) {
      await message.reply({
        embeds: [errorEmbed("You can’t ban yourself.")],
      });
      return;
    }
    if (targetUser.id === message.client.user?.id) {
      await message.reply({
        embeds: [errorEmbed("Nice try.")],
      });
      return;
    }
    if (targetUser.id === message.guild!.ownerId) {
      await message.reply({
        embeds: [errorEmbed("You can’t ban the **server owner**.")],
      });
      return;
    }
    if (targetMember) {
      const v = canPunish(actor, targetMember);
      if (v) {
        await message.reply({ embeds: [errorEmbed(v)] });
        return;
      }
      const me = message.guild!.members.me;
      if (!me) {
        await message.reply({ embeds: [errorEmbed("Could not load my member.")] });
        return;
      }
      const botChk = assertBotHierarchy(me, targetMember);
      if (botChk) {
        await message.reply({ embeds: [errorEmbed(botChk)] });
        return;
      }
      if (!targetMember.bannable) {
        await message.reply({
          embeds: [
            errorEmbed("I can’t ban that member (owner or role hierarchy)."),
          ],
        });
        return;
      }
    }

    const { deleteMessageSeconds, reason } = parseBanOptions(tailArgs);
    const finalReason =
      reason || `Banned by ${message.author.tag}`.slice(0, 512);

    try {
      await message.guild!.bans.create(targetUser.id, {
        reason: finalReason,
        deleteMessageSeconds:
          deleteMessageSeconds > 0 ? deleteMessageSeconds : undefined,
      });
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Ban failed",
            body: "Discord blocked the ban — I need **Ban Members** and my role must be above the target's top role.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    const delDays =
      deleteMessageSeconds > 0 ? Math.round(deleteMessageSeconds / 86400) : 0;
    const delNote =
      delDays > 0
        ? `\n**Message purge:** last **${delDays}** day(s) (Discord limit).`
        : "";

    await createModCase({
      guildId: message.guild!.id,
      kind: BotModCaseKind.BAN,
      actorUserId: message.author.id,
      targetUserId: targetUser.id,
      reason: finalReason,
      metadata: { deleteDays: delDays },
    });

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Banned",
          description:
            `**${targetUser.tag}** (${targetUser.id}) was banned.\n**Reason:** ${finalReason}${delNote}`,
        }),
      ],
    });
  },
};
