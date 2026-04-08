import { PermissionFlagsBits } from "discord.js";
import { getBotPrisma } from "../../lib/db-prisma";
import {
  listCasesForActor,
  listRecentCases,
  caseStatsByKind,
} from "../../lib/mod-case/service";
import {
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import { resolveModerationMember } from "../../lib/moderation-target";
import type { KnifeCommand } from "../types";

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

export const moderationhistoryCommand: KnifeCommand = {
  name: "moderationhistory",
  aliases: ["modhistory", "staffhistory"],
  description: "Cases filed by a staff member — **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".moderationhistory @staff",
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
    const staff = resolved.member;
    const rows = await listCasesForActor(message.guild!.id, staff.id, 20);
    if (rows.length === 0) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Moderation history",
            description: `_No cases filed by **${staff.user.tag}**._`,
          }),
        ],
      });
      return;
    }
    const lines = rows.map(
      (r) =>
        `**#${r.caseNum}** · ${r.kind} · <@${r.targetUserId}> — ${(r.reason ?? "—").slice(0, 50)}`,
    );
    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Cases by ${staff.user.tag}`,
          description: lines.join("\n").slice(0, 3900),
        }),
      ],
    });
  },
};

export const modstatsCommand: KnifeCommand = {
  name: "modstats",
  aliases: ["staffstats", "casestats"],
  description: "Case counts by type in this server — **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".modstats",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const deny = await requireManageMessages(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const rows = await getBotPrisma().botGuildModCase.findMany({
      where: { guildId: message.guild!.id },
      select: { kind: true, actorUserId: true },
    });
    const byKind = caseStatsByKind(rows);
    const kindLines = [...byKind.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `**${k}:** ${n}`)
      .join("\n");

    const actorCount = new Map<string, number>();
    for (const r of rows) {
      actorCount.set(r.actorUserId, (actorCount.get(r.actorUserId) ?? 0) + 1);
    }
    const topActors = [...actorCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, n]) => `<@${id}>: **${n}**`)
      .join("\n");

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Mod statistics",
          description:
            `**Total cases:** ${rows.length}\n\n${kindLines || "_None_"}\n\n**Top staff:**\n${topActors || "—"}`.slice(
              0,
              3900,
            ),
        }),
      ],
    });
  },
};

export const punishmenthistoryCommand: KnifeCommand = {
  name: "punishmenthistory",
  aliases: ["punishments"],
  description: "Alias for recent **.history** list — **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".punishmenthistory",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const deny = await requireManageMessages(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }
    const recent = await listRecentCases(message.guild!.id, 20);
    if (recent.length === 0) {
      await message.reply({
        embeds: [
          minimalEmbed({ title: "Punishments", description: "_No cases._" }),
        ],
      });
      return;
    }
    const lines = recent.map(
      (r) =>
        `**#${r.caseNum}** · ${r.kind} · <@${r.targetUserId}> — ${(r.reason ?? "—").slice(0, 40)}`,
    );
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Recent punishments",
          description: lines.join("\n").slice(0, 3900),
        }),
      ],
    });
  },
};
