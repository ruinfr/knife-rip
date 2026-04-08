import { PermissionFlagsBits } from "discord.js";
import { BotModCaseKind } from "@prisma/client";
import { errorEmbed, minimalEmbed, missingPermissionEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import {
  createModCase,
  sendModLogEmbed,
} from "../../lib/mod-case/service";
import {
  assertBotHierarchy,
  canPunish,
  resolveModerationMember,
} from "../../lib/moderation-target";
import type { KnifeCommand } from "../types";
import { EmbedBuilder } from "discord.js";

async function requireManageMessages(message: import("discord.js").Message) {
  const g = message.guild;
  if (!g)
    return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return missingPermissionEmbed("you", "Manage Messages");
  }
  return null;
}

export const warnCommand: KnifeCommand = {
  name: "warn",
  aliases: ["strike", "wrn"],
  description:
    "Record a warning (case) and DM the member when possible — needs **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".warn @user [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageMessages(message);
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
    const me = message.guild!.members.me;
    if (!me) {
      await message.reply({ embeds: [errorEmbed("Could not load my member.")] });
      return;
    }

    const v = canPunish(actor, target);
    if (v) {
      await message.reply({ embeds: [errorEmbed(v)] });
      return;
    }
    const botChk = assertBotHierarchy(me, target);
    if (botChk) {
      await message.reply({ embeds: [errorEmbed(botChk)] });
      return;
    }

    const reason = tailArgs.join(" ").trim().slice(0, 900) || "No reason given.";
    const { caseNum } = await createModCase({
      guildId: message.guild!.id,
      kind: BotModCaseKind.WARN,
      actorUserId: message.author.id,
      targetUserId: target.id,
      reason,
    });

    let dmOk = false;
    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("Warning")
            .setDescription(
              `**Server:** ${message.guild!.name}\n**Reason:** ${reason}\n**Case:** #${caseNum}`,
            )
            .setColor(0xf0b232),
        ],
      });
      dmOk = true;
    } catch {
      dmOk = false;
    }

    await sendModLogEmbed(
      message.client,
      message.guild!.id,
      new EmbedBuilder()
        .setTitle("Warn")
        .setColor(0xf0b232)
        .setDescription(
          `**Target:** ${target.user.tag} (${target.id})\n**By:** ${message.author.tag}\n**Case:** #${caseNum}\n**DM:** ${dmOk ? "delivered" : "failed"}\n**Reason:** ${reason}`,
        ),
    );

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Warned",
          description:
            `**${target.user.tag}** — case **#${caseNum}**${dmOk ? "" : "\n_DMs are closed — they were not notified privately._"}`,
        }),
      ],
    });
  },
};

export const warningsCommand: KnifeCommand = {
  name: "warnings",
  aliases: ["warnlist", "strikes"],
  description: "List warning cases for a member — **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".warnings @user",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageMessages(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const target = resolved.member;

    const rows = await getBotPrisma().botGuildModCase.findMany({
      where: {
        guildId: message.guild!.id,
        targetUserId: target.id,
        kind: BotModCaseKind.WARN,
      },
      orderBy: { caseNum: "desc" },
      take: 15,
    });

    if (rows.length === 0) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Warnings",
            description: `_No warnings on record for **${target.user.tag}**._`,
          }),
        ],
      });
      return;
    }

    const lines = rows.map(
      (r) =>
        `**#${r.caseNum}** · <t:${Math.floor(r.createdAt.getTime() / 1000)}:R> — ${(r.reason ?? "—").slice(0, 80)}`,
    );
    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Warnings — ${target.user.tag}`,
          description: lines.join("\n").slice(0, 3900),
        }),
      ],
    });
  },
};
