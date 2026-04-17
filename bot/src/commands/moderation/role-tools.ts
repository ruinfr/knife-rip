import { PermissionFlagsBits } from "discord.js";
import { parseScheduledBanMs } from "../../lib/ban-duration";
import { getBotPrisma } from "../../lib/db-prisma";
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
import type { Message } from "discord.js";

async function requireManageRoles(message: Message) {
  const g = message.guild;
  if (!g) return errorEmbed("Servers only.");
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return missingPermissionEmbed("you", "Manage Roles");
  }
  return null;
}

function parseRoleId(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^<@&(\d+)>$/);
  if (m) return m[1];
  if (/^\d{17,20}$/.test(raw.trim())) return raw.trim();
  return null;
}

export const temproleCommand: ArivixCommand = {
  name: "temprole",
  aliases: ["trole"],
  description: "Grant a role until it expires — **Manage Roles**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".temprole @user `<@role>` `7d` [note]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageRoles(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }
    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const roleId = parseRoleId(resolved.tailArgs[0]);
    const durRaw = resolved.tailArgs[1]?.trim();
    const ms = durRaw ? parseScheduledBanMs(durRaw) : null;
    if (!roleId || !ms) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **.temprole** @user `<@role>` `7d`"),
        ],
      });
      return;
    }
    const g = message.guild!;
    const me = g.members.me!;
    const actor =
      message.member ?? (await g.members.fetch(message.author.id));
    const target = resolved.member;
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
    const role = g.roles.cache.get(roleId) ?? (await g.roles.fetch(roleId).catch(() => null));
    if (!role || role.position >= me.roles.highest.position) {
      await message.reply({
        embeds: [errorEmbed("Invalid role or hierarchy.")],
      });
      return;
    }
    const expiresAt = new Date(Date.now() + ms);
    try {
      await target.roles.add(roleId, `Temprole ${message.author.tag}`);
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({ title: "Failed", body: "Could not add role." }),
        ],
      });
      return;
    }
    await getBotPrisma().botGuildTempRoleGrant.create({
      data: {
        guildId: g.id,
        userId: target.id,
        roleId,
        expiresAt,
      },
    });
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Temprole",
          description: `${target} — ${role} until <t:${Math.floor(expiresAt.getTime() / 1000)}:F>`,
        }),
      ],
    });
  },
};

export const temprolelistCommand: ArivixCommand = {
  name: "temprolelist",
  aliases: ["trolelist"],
  description: "Pending timed roles — **Manage Roles**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".temprolelist",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const deny = await requireManageRoles(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }
    const rows = await getBotPrisma().botGuildTempRoleGrant.findMany({
      where: { guildId: message.guild!.id },
      orderBy: { expiresAt: "asc" },
      take: 20,
    });
    if (rows.length === 0) {
      await message.reply({
        embeds: [minimalEmbed({ title: "Temproles", description: "_None._" })],
      });
      return;
    }
    const lines = rows.map(
      (r) =>
        `<@${r.userId}> · <@&${r.roleId}> · <t:${Math.floor(r.expiresAt.getTime() / 1000)}:R>`,
    );
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Temproles",
          description: lines.join("\n").slice(0, 3900),
        }),
      ],
    });
  },
};

export const roleCommand: ArivixCommand = {
  name: "role",
  aliases: ["roletools", "modrole"],
  description: "Role tools — **Manage Roles** (`add`, `remove`, `create`, …)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage:
      ".role add|remove @user `<@role>` · create `<name>` [hex] · delete `<@role>` · color `<@role>` `#hex`",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageRoles(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }
    const g = message.guild!;
    const me = g.members.me!;
    const sub = args[0]?.toLowerCase();
    if (sub === "add" || sub === "remove") {
      const resolved = await resolveModerationMember(message, args.slice(1));
      if (!resolved.ok) {
        await message.reply({ embeds: [resolved.embed] });
        return;
      }
      const rid = parseRoleId(resolved.tailArgs[0]);
      if (!rid) {
        await message.reply({ embeds: [errorEmbed("Mention a role.")] });
        return;
      }
      const role = g.roles.cache.get(rid) ?? (await g.roles.fetch(rid).catch(() => null));
      if (!role || role.position >= me.roles.highest.position) {
        await message.reply({ embeds: [errorEmbed("Bad role / hierarchy.")] });
        return;
      }
      const actor =
        message.member ?? (await g.members.fetch(message.author.id));
      const t = resolved.member;
      const pv = canPunish(actor, t);
      if (pv) {
        await message.reply({ embeds: [errorEmbed(pv)] });
        return;
      }
      const bh = assertBotHierarchy(me, t);
      if (bh) {
        await message.reply({ embeds: [errorEmbed(bh)] });
        return;
      }
      try {
        if (sub === "add") await t.roles.add(rid);
        else await t.roles.remove(rid);
      } catch {
        await message.reply({ embeds: [errorEmbed("Role change failed.")] });
        return;
      }
      await getBotPrisma().botGuildMemberRoleSnapshot.upsert({
        where: {
          guildId_userId: { guildId: g.id, userId: t.id },
        },
        create: {
          guildId: g.id,
          userId: t.id,
          roleIds: [...t.roles.cache.keys()].filter((id) => id !== g.id),
        },
        update: {
          roleIds: [...t.roles.cache.keys()].filter((id) => id !== g.id),
        },
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: sub === "add" ? "Role added" : "Role removed",
            description: `${t.user.tag} · ${role.name}`,
          }),
        ],
      });
      return;
    }
    if (sub === "create") {
      const rest = args.slice(1).join(" ").trim();
      const hexMatch = rest.match(/#?([0-9a-f]{6})\b/i);
      const hex = hexMatch ? hexMatch[0] : null;
      const name = (hex ? rest.replace(hex, "").trim() : rest).slice(0, 100);
      if (!name) {
        await message.reply({
          embeds: [errorEmbed("Usage: **.role create** `<name>` [#RRGGBB]")],
        });
        return;
      }
      const color = hex ? parseInt(hex.replace("#", ""), 16) : undefined;
      const role = await g.roles.create({
        name,
        color,
        reason: message.author.tag,
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Role created",
            description: `${role}`,
          }),
        ],
      });
      return;
    }
    if (sub === "delete") {
      const rid = parseRoleId(args[1]);
      if (!rid) {
        await message.reply({ embeds: [errorEmbed("Mention role to delete.")] });
        return;
      }
      const role = g.roles.cache.get(rid);
      if (!role || role.position >= me.roles.highest.position) {
        await message.reply({ embeds: [errorEmbed("Cannot delete that role.")] });
        return;
      }
      await role.delete(`${message.author.tag} role delete`);
      await message.reply({
        embeds: [minimalEmbed({ title: "Deleted", description: role.name })],
      });
      return;
    }
    if (sub === "color" || sub === "colour") {
      const rid = parseRoleId(args[1]);
      const hex = args[2]?.trim();
      if (!rid || !hex || !/^#?[0-9a-f]{6}$/i.test(hex)) {
        await message.reply({
          embeds: [errorEmbed("Usage: **.role color** `<@role>` `#RRGGBB`")],
        });
        return;
      }
      const role = g.roles.cache.get(rid);
      if (!role || role.position >= me.roles.highest.position) {
        await message.reply({ embeds: [errorEmbed("Bad role.")] });
        return;
      }
      await role.setColor(parseInt(hex.replace("#", ""), 16));
      await message.reply({
        embeds: [minimalEmbed({ title: "Color", description: role.name })],
      });
      return;
    }
    if (sub === "restore") {
      const resolved = await resolveModerationMember(message, args.slice(1));
      if (!resolved.ok) {
        await message.reply({ embeds: [resolved.embed] });
        return;
      }
      const snap = await getBotPrisma().botGuildMemberRoleSnapshot.findUnique({
        where: {
          guildId_userId: { guildId: g.id, userId: resolved.member.id },
        },
      });
      const ids = snap?.roleIds;
      const arr = Array.isArray(ids)
        ? ids.filter((x): x is string => typeof x === "string")
        : [];
      let n = 0;
      for (const id of arr) {
        const role = g.roles.cache.get(id) ?? (await g.roles.fetch(id).catch(() => null));
        if (!role || role.managed || role.position >= me.roles.highest.position) continue;
        await resolved.member.roles.add(id).catch(() => {});
        n++;
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Restore",
            description: `Applied **${n}** role(s) from snapshot.`,
          }),
        ],
      });
      return;
    }
    await message.reply({
      embeds: [
        errorEmbed(
          "Subcommands: **add**, **remove**, **create**, **delete**, **color**, **restore**",
        ),
      ],
    });
  },
};
