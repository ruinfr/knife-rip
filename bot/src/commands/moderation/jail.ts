import type { EmbedBuilder, GuildMember, Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { getBotPrisma } from "../../lib/db-prisma";
import {
  actionableErrorEmbed,
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import {
  collectRemovableRoleIds,
  getJailConfig,
  getJailMemberRow,
  jailLogEmbed,
  parseStoredRoleIds,
  sendJailLog,
} from "../../lib/jail-state";
import { parseModerationDuration } from "../../lib/moderation-duration";
import {
  assertBotHierarchy,
  canPunish,
  resolveModerationMember,
} from "../../lib/moderation-target";
import type { KnifeCommand } from "../types";

function fmtSince(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

async function requireManageRolesActor(
  message: Message,
): Promise<
  | { ok: true; guild: NonNullable<Message["guild"]>; actor: GuildMember; me: GuildMember }
  | { ok: false; embed: EmbedBuilder }
> {
  const g = message.guild;
  if (!g) {
    return {
      ok: false,
      embed: errorEmbed("Use this in a server channel.", { title: "Servers only" }),
    };
  }
  const actor =
    message.member ?? (await g.members.fetch(message.author.id).catch(() => null));
  if (!actor?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { ok: false, embed: missingPermissionEmbed("you", "Manage Roles") };
  }
  const me = g.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return { ok: false, embed: missingPermissionEmbed("bot", "Manage Roles") };
  }
  return { ok: true, guild: g, actor, me };
}

async function ensureJailRoleAssignable(
  guild: NonNullable<Message["guild"]>,
  me: GuildMember,
  jailRoleId: string,
): Promise<EmbedBuilder | null> {
  const jailRole =
    guild.roles.cache.get(jailRoleId) ??
    (await guild.roles.fetch(jailRoleId).catch(() => null));
  if (!jailRole || jailRole.position >= me.roles.highest.position) {
    return errorEmbed(
      "Move **Arivix’s** role **above** the **Jailed** role in Server Settings → Roles.",
    );
  }
  return null;
}

export const jailCommand: KnifeCommand = {
  name: "jail",
  aliases: ["jailuser", "incarcerate"],
  description:
    "Strip manageable roles, assign Jailed, and log (needs **Manage Roles** + `.jailsetup`)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".jail @user [duration] [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const gate = await requireManageRolesActor(message);
    if (!gate.ok) {
      await message.reply({ embeds: [gate.embed] });
      return;
    }
    const { guild, actor, me } = gate;

    const config = await getJailConfig(guild.id);
    if (!config) {
      await message.reply({
        embeds: [
          errorEmbed(
            "This server has no jail setup. An admin should run **`.jailsetup`** first.",
          ),
        ],
      });
      return;
    }

    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const { member: target, tailArgs } = resolved;

    const punish = canPunish(actor, target);
    if (punish) {
      await message.reply({ embeds: [errorEmbed(punish)] });
      return;
    }
    const botChk = assertBotHierarchy(me, target);
    if (botChk) {
      await message.reply({ embeds: [errorEmbed(botChk)] });
      return;
    }

    const chkRole = await ensureJailRoleAssignable(guild, me, config.jailRoleId);
    if (chkRole) {
      await message.reply({ embeds: [chkRole] });
      return;
    }

    const prisma = getBotPrisma();
    const existingRow = await getJailMemberRow(guild.id, target.id);
    if (existingRow) {
      await message.reply({
        embeds: [errorEmbed("That member is **already jailed** (see `.jaillist`).")],
      });
      return;
    }
    if (target.roles.cache.has(config.jailRoleId)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "They have the **Jailed** role but no jail record — fix roles manually or ask an admin.",
          ),
        ],
      });
      return;
    }

    const toRemove = collectRemovableRoleIds(target, config.jailRoleId);
    let reasonParts = tailArgs;
    let releaseAt: Date | null = null;
    const durRaw = tailArgs[0]?.trim();
    const durMs = durRaw ? parseModerationDuration(durRaw) : null;
    if (durMs) {
      releaseAt = new Date(Date.now() + durMs);
      reasonParts = tailArgs.slice(1);
    }
    const reasonBase = reasonParts.join(" ").trim().slice(0, 450);
    const reason = reasonBase || `Jailed by ${message.author.tag}`;
    const auditReason = `Arivix jail: ${reason}`.slice(0, 480);

    const failedRemovals: string[] = [];
    for (const roleId of toRemove) {
      try {
        await target.roles.remove(roleId, auditReason);
      } catch {
        failedRemovals.push(roleId);
      }
    }

    try {
      await target.roles.add(config.jailRoleId, auditReason);
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Jail failed",
            body:
              `Could not assign the **Jailed** role — check role order and **Manage Roles**.\n` +
              (failedRemovals.length > 0
                ? `_Some roles may have been removed before the failure._`
                : ""),
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await prisma.botGuildJailMember.create({
      data: {
        guildId: guild.id,
        userId: target.id,
        removedRoleIds: toRemove,
        reason: reasonBase || undefined,
        jailedByUserId: message.author.id,
        releaseAt,
      },
    });

    const jailChannel = await guild.channels
      .fetch(config.jailChannelId)
      .catch(() => null);
    if (jailChannel?.isTextBased() && !jailChannel.isDMBased()) {
      await jailChannel
        .send(
          `**Jailed:** ${target} · **By:** ${message.author.tag}\n**Reason:** ${reason}`,
        )
        .catch(() => {});
    }

    await sendJailLog(
      message.client,
      config.logChannelId,
      jailLogEmbed({
        title: "Member jailed",
        description:
          `**User:** ${target.user.tag} (${target.id})\n` +
          `**By:** ${message.author.tag} (${message.author.id})\n` +
          `**Roles to restore:** ${toRemove.length}\n` +
          `**Removed OK:** ${toRemove.length - failedRemovals.length}` +
          (failedRemovals.length > 0
            ? ` · **Skipped (could not remove):** ${failedRemovals.length}`
            : "") +
          `\n**Reason:** ${reason}`,
      }),
    );

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Jailed",
          description:
            `**${target.user.tag}** is jailed.\n` +
            (failedRemovals.length > 0
              ? `_Warning: ${failedRemovals.length} role(s) could not be removed (permissions / hierarchy)._\n`
              : "") +
            `**Reason:** ${reason}`,
        }),
      ],
    });
  },
};

export const unjailCommand: KnifeCommand = {
  name: "unjail",
  aliases: ["release", "unjailuser"],
  description:
    "Remove Jailed role and restore saved roles (needs **Manage Roles** + `.jailsetup`)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".unjail @user [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const gate = await requireManageRolesActor(message);
    if (!gate.ok) {
      await message.reply({ embeds: [gate.embed] });
      return;
    }
    const { guild, actor, me } = gate;

    const config = await getJailConfig(guild.id);
    if (!config) {
      await message.reply({
        embeds: [
          errorEmbed(
            "This server has no jail setup. An admin should run **`.jailsetup`** first.",
          ),
        ],
      });
      return;
    }

    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const { member: target, tailArgs } = resolved;

    const punish = canPunish(actor, target);
    if (punish) {
      await message.reply({ embeds: [errorEmbed(punish)] });
      return;
    }
    const botChk = assertBotHierarchy(me, target);
    if (botChk) {
      await message.reply({ embeds: [errorEmbed(botChk)] });
      return;
    }

    const prisma = getBotPrisma();
    const row = await getJailMemberRow(guild.id, target.id);
    if (!row) {
      await message.reply({
        embeds: [errorEmbed("That member is **not** in the jail list (see `.jaillist`).")],
      });
      return;
    }

    const reasonBase = tailArgs.join(" ").trim().slice(0, 450);
    const auditReason = `Arivix unjail: ${reasonBase || message.author.tag}`.slice(0, 480);

    const removedIds = parseStoredRoleIds(row.removedRoleIds);
    const botTop = me.roles.highest.position;
    const restoreFailed: string[] = [];

    try {
      if (target.roles.cache.has(config.jailRoleId)) {
        await target.roles.remove(config.jailRoleId, auditReason);
      }
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Unjail failed",
            body:
              "Could not remove the **Jailed** role — check **Manage Roles** and role order.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    for (const roleId of removedIds) {
      if (roleId === guild.id || roleId === config.jailRoleId) continue;
      const role =
        guild.roles.cache.get(roleId) ??
        (await guild.roles.fetch(roleId).catch(() => null));
      if (!role || role.managed) continue;
      if (role.position >= botTop) {
        restoreFailed.push(role.name);
        continue;
      }
      try {
        await target.roles.add(role, auditReason);
      } catch {
        restoreFailed.push(role.name);
      }
    }

    await prisma.botGuildJailMember.delete({
      where: { guildId_userId: { guildId: guild.id, userId: target.id } },
    });

    await sendJailLog(
      message.client,
      config.logChannelId,
      jailLogEmbed({
        title: "Member released",
        description:
          `**User:** ${target.user.tag} (${target.id})\n` +
          `**By:** ${message.author.tag} (${message.author.id})\n` +
          `**Roles restored:** ${removedIds.length - restoreFailed.length}` +
          (restoreFailed.length > 0
            ? ` · **Not restored (missing / above bot):** ${restoreFailed.slice(0, 12).join(", ")}${restoreFailed.length > 12 ? "…" : ""}`
            : "") +
          (reasonBase ? `\n**Note:** ${reasonBase}` : ""),
      }),
    );

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Unjailed",
          description:
            `**${target.user.tag}** was released.\n` +
            (restoreFailed.length > 0
              ? `_Could not restore: **${restoreFailed.slice(0, 8).join(", ")}**${restoreFailed.length > 8 ? "…" : ""}_\n`
              : ""),
        }),
      ],
    });
  },
};

export const jaillistCommand: KnifeCommand = {
  name: "jaillist",
  aliases: ["jails", "whoisjailed"],
  description: "List members jailed in this server — **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".jaillist",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const g = message.guild;
    if (!g) {
      await message.reply({
        embeds: [errorEmbed("Servers only.", { title: "Servers only" })],
      });
      return;
    }
    const mem =
      message.member ?? (await g.members.fetch(message.author.id).catch(() => null));
    if (!mem?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Messages")],
      });
      return;
    }
    const guild = g;

    const rows = await getBotPrisma().botGuildJailMember.findMany({
      where: { guildId: guild.id },
      orderBy: { jailedAt: "asc" },
    });

    if (rows.length === 0) {
      await message.reply({
        embeds: [minimalEmbed({ title: "Jail list", description: "_Nobody is jailed._" })],
      });
      return;
    }

    const lines: string[] = [];
    for (const r of rows) {
      const u = await message.client.users.fetch(r.userId).catch(() => null);
      const tag = u ? `${u.tag}` : r.userId;
      const reason = (r.reason ?? "—").trim().slice(0, 80);
      lines.push(
        `• <@${r.userId}> (${tag}) · ${fmtSince(r.jailedAt)} · ${reason || "—"}`,
      );
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Jailed (${rows.length})`,
          description: lines.join("\n").slice(0, 3900),
        }),
      ],
    });
  },
};
