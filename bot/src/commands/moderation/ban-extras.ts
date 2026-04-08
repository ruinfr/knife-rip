import { AuditLogEvent, PermissionFlagsBits } from "discord.js";
import { BotModCaseKind } from "@prisma/client";
import { parseScheduledBanMs } from "../../lib/ban-duration";
import { getBotPrisma } from "../../lib/db-prisma";
import {
  actionableErrorEmbed,
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import { createModCase } from "../../lib/mod-case/service";
import {
  assertBotHierarchy,
  canPunish,
  resolveBanTarget,
  resolveModerationMember,
} from "../../lib/moderation-target";
import {
  cancelUnbanAllJob,
  createUnbanAllJob,
  deleteUnbanAllJob,
  isUnbanAllCancelled,
} from "../../lib/unban-all-jobs";
import type { KnifeCommand } from "../types";
import type { Message } from "discord.js";

async function requireBan(message: Message) {
  const g = message.guild;
  if (!g)
    return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.BanMembers)) {
    return missingPermissionEmbed("you", "Ban Members");
  }
  return null;
}

async function requireAdmin(message: Message) {
  const g = message.guild;
  if (!g)
    return errorEmbed("Servers only.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.Administrator)) {
    return missingPermissionEmbed("you", "Administrator");
  }
  return null;
}

function requireOwner(message: Message): string | null {
  if (!message.guild) return "Servers only.";
  if (message.author.id !== message.guild.ownerId) {
    return "Only the **server owner** can use this.";
  }
  return null;
}

export const unbanCommand: KnifeCommand = {
  name: "unban",
  aliases: ["ub", "pardon"],
  description: "Unban a user by id — **Ban Members**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".unban `<user id>` [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireBan(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const raw = args[0]?.trim();
    if (!raw || !/^\d{17,20}$/.test(raw)) {
      await message.reply({
        embeds: [errorEmbed("Pass a **user ID** to unban. Example: `.unban 123…`")],
      });
      return;
    }
    const reason = args.slice(1).join(" ").trim().slice(0, 450) || `Unban by ${message.author.tag}`;

    try {
      await message.guild!.members.unban(raw, reason);
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Unban failed",
            body: "They may not be banned, or I need **Ban Members**.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await getBotPrisma().botGuildScheduledUnban.deleteMany({
      where: { guildId: message.guild!.id, userId: raw },
    });
    await getBotPrisma().botGuildHardban.deleteMany({
      where: { guildId: message.guild!.id, userId: raw },
    });

    await createModCase({
      guildId: message.guild!.id,
      kind: BotModCaseKind.UNBAN,
      actorUserId: message.author.id,
      targetUserId: raw,
      reason,
    });

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Unbanned",
          description: `**${raw}** was unbanned.\n**Reason:** ${reason}`,
        }),
      ],
    });
  },
};

export const softbanCommand: KnifeCommand = {
  name: "softban",
  description:
    "Ban with 24h message delete, then unban (kick + scrub) — **Ban Members**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".softban @user [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireBan(message);
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
    if (botChk || !target.bannable) {
      await message.reply({
        embeds: [
          errorEmbed(botChk ?? "I can’t ban that member (hierarchy)."),
        ],
      });
      return;
    }

    const reason =
      resolved.tailArgs.join(" ").trim().slice(0, 450) ||
      `Softban by ${message.author.tag}`;

    try {
      await message.guild!.bans.create(target.id, {
        deleteMessageSeconds: 86400,
        reason,
      });
      await message.guild!.members.unban(target.id, "Softban (immediate unban)");
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Softban failed",
            body: "Ban/unban chain failed — check **Ban Members** and role order.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await createModCase({
      guildId: message.guild!.id,
      kind: BotModCaseKind.SOFTBAN,
      actorUserId: message.author.id,
      targetUserId: target.id,
      reason,
    });

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Soft-banned",
          description: `**${target.user.tag}** was kicked; ~1 day of messages purged.\n**Reason:** ${reason}`,
        }),
      ],
    });
  },
};

export const tempbanCommand: KnifeCommand = {
  name: "tempban",
  aliases: ["tban"],
  description:
    "Ban until a duration elapses (auto-unban) — **Ban Members**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".tempban @user|id 7d [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireBan(message);
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
    const durRaw = tailArgs[0]?.trim();
    const ms = durRaw ? parseScheduledBanMs(durRaw) : null;
    if (!ms) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **.tempban** `@user|id` `7d` [reason] — s/m/h/d/w"),
        ],
      });
      return;
    }

    const reasonBase = tailArgs.slice(1).join(" ").trim().slice(0, 400);
    const reason = reasonBase || `Tempban by ${message.author.tag}`;
    const actor =
      message.member ??
      (await message.guild!.members.fetch(message.author.id));
    const me = message.guild!.members.me;
    if (!me) {
      await message.reply({ embeds: [errorEmbed("Could not load my member.")] });
      return;
    }

    if (targetUser.id === actor.id || targetUser.id === message.client.user?.id) {
      await message.reply({ embeds: [errorEmbed("Invalid target.")] });
      return;
    }
    if (targetUser.id === message.guild?.ownerId) {
      await message.reply({ embeds: [errorEmbed("You can’t ban the owner.")] });
      return;
    }
    if (targetMember) {
      const v = canPunish(actor, targetMember);
      if (v) {
        await message.reply({ embeds: [errorEmbed(v)] });
        return;
      }
      const botChk = assertBotHierarchy(me, targetMember);
      if (botChk || !targetMember.bannable) {
        await message.reply({
          embeds: [
            errorEmbed(botChk ?? "Member not bannable."),
          ],
        });
        return;
      }
    }

    const expiresAt = new Date(Date.now() + ms);
    const prisma = getBotPrisma();

    try {
      await message.guild!.bans.create(targetUser.id, { reason });
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Tempban failed",
            body: "Could not ban — check permissions and hierarchy.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await prisma.botGuildScheduledUnban.upsert({
      where: {
        guildId_userId: {
          guildId: message.guild!.id,
          userId: targetUser.id,
        },
      },
      create: {
        guildId: message.guild!.id,
        userId: targetUser.id,
        expiresAt,
        actorUserId: message.author.id,
        reason,
      },
      update: {
        expiresAt,
        actorUserId: message.author.id,
        reason,
      },
    });

    await createModCase({
      guildId: message.guild!.id,
      kind: BotModCaseKind.TEMPBAN,
      actorUserId: message.author.id,
      targetUserId: targetUser.id,
      reason: `${reason} (until ${expiresAt.toISOString()})`,
    });

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Temp-banned",
          description:
            `**${targetUser.tag}** banned until <t:${Math.floor(expiresAt.getTime() / 1000)}:F>.\n**Reason:** ${reason}`,
        }),
      ],
    });
  },
};

export const hardbanCommand: KnifeCommand = {
  name: "hardban",
  aliases: ["hban", "fban"],
  description:
    "Perma-ban flag: re-ban if they rejoin — **Ban Members** + **Administrator**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".hardban @user|id [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const banDeny = await requireBan(message);
    if (banDeny) {
      await message.reply({ embeds: [banDeny] });
      return;
    }
    const admDeny = await requireAdmin(message);
    if (admDeny) {
      await message.reply({ embeds: [admDeny] });
      return;
    }

    const resolved = await resolveBanTarget(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const { user: targetUser, member: targetMember } = resolved;
    const tail = resolved.tailArgs.join(" ").trim().slice(0, 450);
    const reason = tail || `Hardban by ${message.author.tag}`;
    const actor =
      message.member ??
      (await message.guild!.members.fetch(message.author.id));
    const me = message.guild!.members.me;
    if (!me) {
      await message.reply({ embeds: [errorEmbed("Could not load my member.")] });
      return;
    }
    if (targetUser.id === message.guild!.ownerId) {
      await message.reply({ embeds: [errorEmbed("Invalid target.")] });
      return;
    }
    if (targetMember) {
      const v = canPunish(actor, targetMember);
      if (v) {
        await message.reply({ embeds: [errorEmbed(v)] });
        return;
      }
      const botChk = assertBotHierarchy(me, targetMember);
      if (botChk || !targetMember.bannable) {
        await message.reply({
          embeds: [errorEmbed(botChk ?? "Not bannable.")],
        });
        return;
      }
    }

    await getBotPrisma().botGuildHardban.upsert({
      where: {
        guildId_userId: { guildId: message.guild!.id, userId: targetUser.id },
      },
      create: {
        guildId: message.guild!.id,
        userId: targetUser.id,
        reason,
        createdById: message.author.id,
      },
      update: { reason, createdById: message.author.id },
    });

    try {
      await message.guild!.bans.create(targetUser.id, { reason });
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Hardban failed",
            body: "Could not ban user.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await getBotPrisma().botGuildScheduledUnban.deleteMany({
      where: { guildId: message.guild!.id, userId: targetUser.id },
    });

    await createModCase({
      guildId: message.guild!.id,
      kind: BotModCaseKind.HARD_BAN,
      actorUserId: message.author.id,
      targetUserId: targetUser.id,
      reason,
    });

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Hardban set",
          description: `**${targetUser.tag}** is banned and will be re-banned on rejoin.`,
        }),
      ],
    });
  },
};

export const hardbanlistCommand: KnifeCommand = {
  name: "hardbanlist",
  aliases: ["hardbans"],
  description: "List hardbanned user ids — **Administrator**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".hardbanlist",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const deny = await requireAdmin(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }
    const rows = await getBotPrisma().botGuildHardban.findMany({
      where: { guildId: message.guild!.id },
      take: 40,
      orderBy: { createdAt: "desc" },
    });
    if (rows.length === 0) {
      await message.reply({
        embeds: [minimalEmbed({ title: "Hardbans", description: "_None._" })],
      });
      return;
    }
    const lines = rows.map(
      (r) =>
        `<@${r.userId}> \`${r.userId}\` — ${(r.reason ?? "—").slice(0, 60)}`,
    );
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Hardban list",
          description: lines.join("\n").slice(0, 3900),
        }),
      ],
    });
  },
};

export const unbanallCommand: KnifeCommand = {
  name: "unbanall",
  aliases: ["massunban", "uball"],
  description: "Unban everyone (slow) — **server owner only**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".unbanall",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const o = requireOwner(message);
    if (o) {
      await message.reply({ embeds: [errorEmbed(o)] });
      return;
    }
    const deny = await requireBan(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const guild = message.guild!;
    const jobId = createUnbanAllJob(guild.id);
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Unban all started",
          description:
            `Processing bans in the background. Use **.unbanallcancel** to stop.\nJob: \`${jobId}\``,
        }),
      ],
    });

    void (async () => {
      let n = 0;
      try {
        const bans = await guild.bans.fetch();
        for (const [, ban] of bans) {
          if (isUnbanAllCancelled(jobId)) break;
          await guild.members.unban(ban.user.id, `Unban all — ${message.author.tag}`).catch(() => {});
          n++;
          await new Promise((r) => setTimeout(r, 1200));
        }
      } finally {
        deleteUnbanAllJob(jobId);
      }
      const replyCh = message.channel;
      if (replyCh.isTextBased() && !replyCh.isDMBased()) {
        await replyCh.send({
          embeds: [
            minimalEmbed({
              title: "Unban all finished",
              description: `Attempted **${n}** unban(s).`,
            }),
          ],
        }).catch(() => {});
      }
    })();
  },
};

export const unbanallcancelCommand: KnifeCommand = {
  name: "unbanallcancel",
  aliases: ["ubacancel", "canceluball"],
  description: "Cancel **unbanall** — **server owner**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".unbanallcancel",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const o = requireOwner(message);
    if (o) {
      await message.reply({ embeds: [errorEmbed(o)] });
      return;
    }
    const ok = cancelUnbanAllJob(message.guild!.id);
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Unban all",
          description: ok
            ? "Cancellation requested."
            : "No active unban-all job.",
        }),
      ],
    });
  },
};

export const banrecentCommand: KnifeCommand = {
  name: "banrecent",
  aliases: ["banrecently"],
  description: "Recent audit-log ban entries — **Ban Members** + **View Audit Log**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".banrecent [count 1-25]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireBan(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }
    const mem =
      message.member ??
      (await message.guild!.members.fetch(message.author.id).catch(() => null));
    if (!mem?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "View Audit Log")],
      });
      return;
    }

    const n = Math.min(25, Math.max(1, parseInt(args[0] ?? "10", 10) || 10));
    const logs = await message.guild!.fetchAuditLogs({
      limit: n,
      type: AuditLogEvent.MemberBanAdd,
    });
    const lines: string[] = [];
    for (const [, entry] of logs.entries) {
      const t = entry.target;
      const tid = t && "id" in t ? t.id : "?";
      lines.push(
        `**${entry.reason ?? "—"}** — <@${tid}> · by <@${entry.executorId}>`,
      );
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Recent bans (audit)",
          description: lines.join("\n").slice(0, 3900) || "_None._",
        }),
      ],
    });
  },
};

export const banpurgeCommand: KnifeCommand = {
  name: "banpurge",
  aliases: ["bpurge", "userpurge"],
  description:
    "Bulk-delete a user’s recent messages in this channel — **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".banpurge @user [amount 1-100]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const g = message.guild;
    if (!g) {
      await message.reply({
        embeds: [errorEmbed("Servers only.")],
      });
      return;
    }
    const mem =
      message.member ??
      (await g.members.fetch(message.author.id).catch(() => null));
    if (!mem?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Messages")],
      });
      return;
    }
    const ch = message.channel;
    if (!ch.isTextBased() || ch.isDMBased()) {
      await message.reply({
        embeds: [errorEmbed("Use this in a text channel.")],
      });
      return;
    }

    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const uid = resolved.member.id;
    const amt = Math.min(
      100,
      Math.max(1, parseInt(resolved.tailArgs[0] ?? "50", 10) || 50),
    );

    const collected = await ch.messages.fetch({ limit: 100 });
    const toDelete = [...collected.filter(
      (m) =>
        m.author.id === uid &&
        !m.pinned &&
        Date.now() - m.createdTimestamp < 13.5 * 86400000,
    ).values()].slice(0, amt);
    if (toDelete.length === 0) {
      await message.reply({
        embeds: [minimalEmbed({ title: "Ban purge", description: "_No messages._" })],
      });
      return;
    }
    try {
      await ch.bulkDelete(toDelete);
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Bulk delete failed",
            body: "Messages may be too old (>14 days) or I lack permission.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Messages purged",
          description: `Removed **${toDelete.length}** message(s) from **${resolved.member.user.tag}**.`,
        }),
      ],
    }).catch(() => {});
  },
};
