import {
  ChannelType,
  PermissionFlagsBits,
  type NewsChannel,
  type TextChannel,
} from "discord.js";
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
import type { KnifeCommand } from "../types";
import type { Message } from "discord.js";

function parseChannelId(message: Message, raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^<#(\d+)>$/);
  if (m) return m[1];
  if (/^\d{17,20}$/.test(raw.trim())) return raw.trim();
  return null;
}

export const stripstaffCommand: KnifeCommand = {
  name: "stripstaff",
  aliases: ["striproles", "removestaffroles"],
  description: "Remove all manageable non-integration roles — **Administrator**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".stripstaff @user",
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
    if (!mem?.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Administrator")],
      });
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
      (await g.members.fetch(message.author.id).catch(() => null));
    if (!actor) {
      await message.reply({ embeds: [errorEmbed("Could not load you as member.")] });
      return;
    }
    const pv = canPunish(actor, target);
    if (pv) {
      await message.reply({ embeds: [errorEmbed(pv)] });
      return;
    }
    const me = g.members.me;
    if (!me) return;
    const botChk = assertBotHierarchy(me, target);
    if (botChk) {
      await message.reply({ embeds: [errorEmbed(botChk)] });
      return;
    }
    let n = 0;
    for (const [, role] of target.roles.cache) {
      if (role.id === g.id || role.managed) continue;
      if (role.position >= me.roles.highest.position) continue;
      await target.roles.remove(role, `Stripstaff ${message.author.tag}`).catch(() => {});
      n++;
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Stripstaff",
          description: `Processed **${n}** role removal(s) for **${target.user.tag}**.`,
        }),
      ],
    });
  },
};

export const topicCommand: KnifeCommand = {
  name: "topic",
  aliases: ["chantopic", "settopic"],
  description: "Set this text channel topic — **Manage Channels**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".topic `<text>`",
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
    if (!mem?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Channels")],
      });
      return;
    }
    const ch = message.channel;
    if (!ch.isTextBased() || ch.isDMBased() || !("setTopic" in ch)) {
      await message.reply({ embeds: [errorEmbed("Use in a text channel.")] });
      return;
    }
    const topic = args.join(" ").trim().slice(0, 1024);
    if (!topic) {
      await message.reply({ embeds: [errorEmbed("Pass topic text.")] });
      return;
    }
    try {
      await (
        ch as import("discord.js").TextChannel
      ).setTopic(topic, message.author.tag);
    } catch {
      await message.reply({ embeds: [errorEmbed("Could not set topic.")] });
      return;
    }
    await message.reply({
      embeds: [minimalEmbed({ title: "Topic updated", description: topic.slice(0, 500) })],
    });
  },
};

async function hideUnhide(message: Message, args: string[], hide: boolean) {
  const g = message.guild;
  if (!g) {
    await message.reply({ embeds: [errorEmbed("Servers only.")] });
    return;
  }
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await message.reply({
      embeds: [missingPermissionEmbed("you", "Manage Channels")],
    });
    return;
  }
  let chId = parseChannelId(message, args[0]);
  let roleIdx = 1;
  if (!chId) {
    chId = message.channel.id;
    roleIdx = 0;
  }
  const ch = await g.channels.fetch(chId).catch(() => null);
  if (
    !ch ||
    (ch.type !== ChannelType.GuildText &&
      ch.type !== ChannelType.GuildAnnouncement)
  ) {
    await message.reply({ embeds: [errorEmbed("Invalid channel.")] });
    return;
  }
  const textCh = ch as TextChannel | NewsChannel;
  const roleRaw = args[roleIdx];
  const roleId =
    roleRaw?.match(/^<@&(\d+)>$/)?.[1] ??
    (roleRaw && /^\d{17,20}$/.test(roleRaw) ? roleRaw : g.roles.everyone.id);
  try {
    await textCh.permissionOverwrites.edit(
      roleId,
      { ViewChannel: hide ? false : null },
      { reason: hide ? "Hide channel" : "Unhide channel" },
    );
  } catch {
    await message.reply({
      embeds: [
        actionableErrorEmbed({
          title: "Failed",
          body: "Could not update overwrites.",
        }),
      ],
    });
    return;
  }
  const who =
    roleId === g.roles.everyone.id ? "@everyone" : `<@&${roleId}>`;
  await message.reply({
    embeds: [
      minimalEmbed({
        title: hide ? "Hidden" : "Visible",
        description: `${textCh} · ${who}`,
      }),
    ],
  });
}

export const hideCommand: KnifeCommand = {
  name: "hide",
  aliases: ["hidechannel", "hidchan"],
  description: "Deny **View Channel** for a role (default @everyone) — **Manage Channels**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".hide [#channel] [@role]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    await hideUnhide(message, args, true);
  },
};

export const unhideCommand: KnifeCommand = {
  name: "unhide",
  aliases: ["showchannel", "revealchan"],
  description: "Reset **View Channel** override (inherit) — **Manage Channels**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".unhide [#channel] [@role]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    await hideUnhide(message, args, false);
  },
};

export const clearinvitesCommand: KnifeCommand = {
  name: "clearinvites",
  aliases: ["inviteclear"],
  description: "Delete all guild invites — **Manage Guild**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".clearinvites",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const g = message.guild!;
    const mem =
      message.member ??
      (await g.members.fetch(message.author.id).catch(() => null));
    if (!mem?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Server")],
      });
      return;
    }
    const invites = await g.invites.fetch();
    let n = 0;
    for (const [, inv] of invites) {
      await inv.delete(`Clearinvites ${message.author.tag}`).catch(() => {});
      n++;
      await new Promise((r) => setTimeout(r, 400));
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Invites cleared",
          description: `Deleted **${n}** invite(s).`,
        }),
      ],
    });
  },
};

export const newmembersCommand: KnifeCommand = {
  name: "newmembers",
  aliases: ["recentjoins"],
  description: "Recent joins — **Manage Guild**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".newmembers [count]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const g = message.guild!;
    const mem =
      message.member ??
      (await g.members.fetch(message.author.id).catch(() => null));
    if (!mem?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Server")],
      });
      return;
    }
    const n = Math.min(25, Math.max(1, parseInt(args[0] ?? "10", 10) || 10));
    await g.members.fetch({ limit: 50 });
    const sorted = [...g.members.cache.values()]
      .filter((m) => !m.user.bot)
      .sort((a, b) => (b.joinedTimestamp ?? 0) - (a.joinedTimestamp ?? 0))
      .slice(0, n);
    const lines = sorted.map(
      (m) =>
        `${m.user.tag} · <t:${Math.floor((m.joinedTimestamp ?? 0) / 1000)}:R>`,
    );
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Recent joins",
          description: lines.join("\n").slice(0, 3900) || "_None._",
        }),
      ],
    });
  },
};

export const recentbanCommand: KnifeCommand = {
  name: "recentban",
  aliases: ["joinban", "banfresh"],
  description: "Ban members who joined within N minutes — **Ban Members**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".recentban `<minutes>` [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await (async () => {
      const g = message.guild;
      if (!g) return errorEmbed("Servers only.");
      const mem =
        message.member ??
        (await g.members.fetch(message.author.id).catch(() => null));
      if (!mem?.permissions.has(PermissionFlagsBits.BanMembers)) {
        return missingPermissionEmbed("you", "Ban Members");
      }
      return null;
    })();
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }
    const minutes = parseInt(args[0] ?? "", 10);
    if (!Number.isFinite(minutes) || minutes < 1) {
      await message.reply({
        embeds: [errorEmbed("Usage: **.recentban** `<minutes>` [reason]")],
      });
      return;
    }
    const reason =
      args.slice(1).join(" ").trim().slice(0, 450) || `Recentban ${message.author.tag}`;
    const cutoff = Date.now() - minutes * 60_000;
    const g = message.guild!;
    await g.members.fetch();
    const victims = [...g.members.cache.values()].filter(
      (m) => (m.joinedTimestamp ?? 0) >= cutoff && m.bannable,
    );
    let n = 0;
    for (const m of victims) {
      await g.members.ban(m, { deleteMessageSeconds: 0, reason }).catch(() => {});
      n++;
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Recent ban",
          description: `Banned **${n}** member(s) who joined in the last **${minutes}** min.`,
        }),
      ],
    });
  },
};

export const dragCommand: KnifeCommand = {
  name: "drag",
  aliases: ["pull", "vcdrag"],
  description: "Move a member to your current voice channel — **Move Members**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".drag @user",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const g = message.guild!;
    const mem =
      message.member ??
      (await g.members.fetch(message.author.id).catch(() => null));
    if (!mem?.permissions.has(PermissionFlagsBits.MoveMembers)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Move Members")],
      });
      return;
    }
    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const actorV = mem.voice.channel;
    if (!actorV) {
      await message.reply({
        embeds: [errorEmbed("Join a **voice channel** first.")],
      });
      return;
    }
    const target = resolved.member;
    if (!target.voice.channel) {
      await message.reply({ embeds: [errorEmbed("Target is not in voice.")] });
      return;
    }
    try {
      await target.voice.setChannel(actorV, `Drag ${message.author.tag}`);
    } catch {
      await message.reply({ embeds: [errorEmbed("Move failed.")] });
      return;
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Moved",
          description: `**${target.user.tag}** → ${actorV}`,
        }),
      ],
    });
  },
};

export const moveallCommand: KnifeCommand = {
  name: "moveall",
  aliases: ["massmove", "movevc"],
  description:
    "Move everyone from your VC to another — **Administrator**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".moveall `<voice channel id or #channel>`",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const g = message.guild!;
    const mem =
      message.member ??
      (await g.members.fetch(message.author.id).catch(() => null));
    if (!mem?.permissions.has(PermissionFlagsBits.Administrator)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Administrator")],
      });
      return;
    }
    const from = mem.voice.channel;
    if (!from || !from.isVoiceBased()) {
      await message.reply({
        embeds: [errorEmbed("Join the **source** voice channel first.")],
      });
      return;
    }
    const raw = args[0]?.trim();
    const toId = raw?.match(/^<#(\d+)>$/)?.[1] ?? (raw && /^\d{17,20}$/.test(raw) ? raw : null);
    if (!toId) {
      await message.reply({
        embeds: [errorEmbed("Usage: **.moveall** `#voice-channel`")],
      });
      return;
    }
    const to = await g.channels.fetch(toId).catch(() => null);
    if (!to?.isVoiceBased()) {
      await message.reply({ embeds: [errorEmbed("Target must be a voice channel.")] });
      return;
    }
    let n = 0;
    for (const [, m] of from.members) {
      await m.voice.setChannel(to, `Moveall ${message.author.tag}`).catch(() => {});
      n++;
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Move all",
          description: `Moved **${n}** member(s) → ${to}.`,
        }),
      ],
    });
  },
};

export const permissionsCommand: KnifeCommand = {
  name: "permissions",
  aliases: ["perms"],
  description: "Show whether you have **Manage Roles/Channels** here",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".permissions [@user]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const g = message.guild!;
    const resolved = await resolveModerationMember(message, args);
    const target = resolved.ok
      ? resolved.member
      : await g.members.fetch(message.author.id);
    const ch = message.channel;
    const perms =
      target.permissionsIn(ch.id).toArray().slice(0, 40).join(", ") || "—";
    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Perms — ${target.user.tag}`,
          description: perms.slice(0, 3900),
        }),
      ],
    });
  },
};

export const setupCommand: KnifeCommand = {
  name: "setup",
  aliases: ["modsetup", "modtools"],
  description:
    "Points admins to **.jailsetup** and **.setupmute**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".setup",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Moderation setup",
          description:
            "• **Jail:** `.jailsetup` (Administrator)\n" +
            "• **Muted role:** `.setupmute` (Manage Roles + Channels)\n" +
            "• **Cases / modlog:** use **.history** and configure log if you add a **.modlog** alias later.",
        }),
      ],
    });
  },
};

export const stickyroleCommand: KnifeCommand = {
  name: "stickyrole",
  aliases: ["persistrole", "reapplyrole"],
  description: "Re-apply role on join — **Server Owner**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".stickyrole add|remove|list @user `<@role>`",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const g = message.guild!;
    if (message.author.id !== g.ownerId) {
      await message.reply({
        embeds: [errorEmbed("Only the **server owner** can use this.")],
      });
      return;
    }
    const prisma = getBotPrisma();
    const head = args[0]?.toLowerCase();
    if (head === "list") {
      const rows = await prisma.botGuildStickyRole.findMany({
        where: { guildId: g.id },
        take: 30,
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Sticky roles",
            description:
              rows.length === 0
                ? "_None._"
                : rows
                    .map((r) => `<@${r.userId}> → <@&${r.roleId}>`)
                    .join("\n")
                    .slice(0, 3900),
          }),
        ],
      });
      return;
    }
    const resolved = await resolveModerationMember(message, args.slice(1));
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const roleRaw = resolved.tailArgs[0];
    const roleId =
      roleRaw?.match(/^<@&(\d+)>$/)?.[1] ??
      (roleRaw && /^\d{17,20}$/.test(roleRaw) ? roleRaw : null);
    if (!roleId) {
      await message.reply({
        embeds: [errorEmbed("Mention a **role** after the user.")],
      });
      return;
    }
    if (head === "add") {
      await prisma.botGuildStickyRole.upsert({
        where: {
          guildId_userId_roleId: {
            guildId: g.id,
            userId: resolved.member.id,
            roleId,
          },
        },
        create: {
          guildId: g.id,
          userId: resolved.member.id,
          roleId,
          setById: message.author.id,
        },
        update: { setById: message.author.id },
      });
      await message.reply({
        embeds: [minimalEmbed({ title: "Sticky role", description: "Saved." })],
      });
      return;
    }
    if (head === "remove") {
      await prisma.botGuildStickyRole.deleteMany({
        where: {
          guildId: g.id,
          userId: resolved.member.id,
          roleId,
        },
      });
      await message.reply({
        embeds: [minimalEmbed({ title: "Removed", description: "Sticky entry deleted." })],
      });
      return;
    }
    await message.reply({
      embeds: [
        errorEmbed("**add** | **remove** | **list** — owner only"),
      ],
    });
  },
};

export const forcenicknameCommand: KnifeCommand = {
  name: "forcenickname",
  aliases: ["forcenick"],
  description: "Save a nickname to re-apply on join — **Manage Nicknames**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".forcenickname @user `<nick>` · list · clear",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const g = message.guild!;
    const mem =
      message.member ??
      (await g.members.fetch(message.author.id).catch(() => null));
    const prisma = getBotPrisma();
    const head = args[0]?.toLowerCase();
    if (head === "list") {
      if (!mem?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
        await message.reply({
          embeds: [missingPermissionEmbed("you", "Manage Nicknames")],
        });
        return;
      }
      const rows = await prisma.botGuildForcedNickname.findMany({
        where: { guildId: g.id },
        take: 25,
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Forced nicks",
            description:
              rows.length === 0
                ? "_None._"
                : rows
                    .map((r) => `<@${r.userId}> → ${r.nickname}`)
                    .join("\n")
                    .slice(0, 3900),
          }),
        ],
      });
      return;
    }
    if (!mem?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Nicknames")],
      });
      return;
    }
    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const tail = resolved.tailArgs.join(" ").trim();
    if (tail.toLowerCase() === "clear" || head === "clear") {
      await prisma.botGuildForcedNickname.deleteMany({
        where: { guildId: g.id, userId: resolved.member.id },
      });
      await message.reply({
        embeds: [minimalEmbed({ title: "Cleared", description: "Forced nick removed." })],
      });
      return;
    }
    if (!tail) {
      await message.reply({
        embeds: [errorEmbed("Usage: **.forcenickname** @user `<nick>`")],
      });
      return;
    }
    const nick = tail.slice(0, 32);
    await prisma.botGuildForcedNickname.upsert({
      where: { guildId_userId: { guildId: g.id, userId: resolved.member.id } },
      create: {
        guildId: g.id,
        userId: resolved.member.id,
        nickname: nick,
        setById: message.author.id,
      },
      update: { nickname: nick, setById: message.author.id },
    });
    await resolved.member.setNickname(nick, "Forced nick").catch(() => {});
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Forced nickname",
          description: `**${resolved.member.user.tag}** → \`${nick}\``,
        }),
      ],
    });
  },
};
