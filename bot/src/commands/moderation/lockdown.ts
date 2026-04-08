import {
  ChannelType,
  PermissionFlagsBits,
  type Message,
  type NewsChannel,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import { getBotPrisma } from "../../lib/db-prisma";
import {
  actionableErrorEmbed,
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import type { KnifeCommand } from "../types";

function parseChannelId(message: Message, raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^<#(\d+)>$/);
  if (m) return m[1];
  if (/^\d{17,20}$/.test(raw.trim())) return raw.trim();
  return null;
}

async function requireManageCh(message: Message) {
  const g = message.guild;
  if (!g)
    return errorEmbed("Servers only.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return missingPermissionEmbed("you", "Manage Channels");
  }
  return null;
}

async function requireManageGuild(message: Message) {
  const g = message.guild;
  if (!g)
    return errorEmbed("Servers only.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return missingPermissionEmbed("you", "Manage Server");
  }
  return null;
}

async function textChannelsToLock(
  guildId: string,
  guild: import("discord.js").Guild,
): Promise<(TextChannel | NewsChannel)[]> {
  const prisma = getBotPrisma();
  const ignores = await prisma.botGuildLockdownIgnore.findMany({
    where: { guildId },
    select: { channelId: true },
  });
  const skip = new Set(ignores.map((i) => i.channelId));
  const out: (TextChannel | NewsChannel)[] = [];
  for (const ch of guild.channels.cache.values()) {
    if (skip.has(ch.id)) continue;
    if (
      ch.type === ChannelType.GuildText ||
      ch.type === ChannelType.GuildAnnouncement
    ) {
      out.push(ch as TextChannel | NewsChannel);
    }
  }
  return out;
}

export const lockdownCommand: KnifeCommand = {
  name: "lockdown",
  aliases: ["serverlock", "emergencylock"],
  description:
    "Lock channel(s) — **Manage Channels** (sub: **all**, **role**, **ignore**)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage:
      ".lockdown [#channel] [reason] · all · role `<@role>` · ignore add|remove|list `#ch`",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageCh(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const guild = message.guild!;
    const me = guild.members.me!;
    const head = args[0]?.toLowerCase();

    if (head === "ignore") {
      const sub = args[1]?.toLowerCase();
      const mg = await requireManageGuild(message);
      if (mg) {
        await message.reply({ embeds: [mg] });
        return;
      }
      const prisma = getBotPrisma();
      if (sub === "list") {
        const rows = await prisma.botGuildLockdownIgnore.findMany({
          where: { guildId: guild.id },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Lockdown ignores",
              description:
                rows.length === 0
                  ? "_None._"
                  : rows.map((r) => `<#${r.channelId}>`).join("\n"),
            }),
          ],
        });
        return;
      }
      const chId = parseChannelId(message, args[2]);
      if ((sub === "add" || sub === "remove") && chId) {
        if (sub === "add") {
          await prisma.botGuildLockdownIgnore.upsert({
            where: {
              guildId_channelId: { guildId: guild.id, channelId: chId },
            },
            create: { guildId: guild.id, channelId: chId },
            update: {},
          });
        } else {
          await prisma.botGuildLockdownIgnore.deleteMany({
            where: { guildId: guild.id, channelId: chId },
          });
        }
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Ignore list",
              description: `${sub === "add" ? "Added" : "Removed"} <#${chId}>.`,
            }),
          ],
        });
        return;
      }
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.lockdown ignore** `add|remove` `#channel|** **.lockdown ignore** `list`",
          ),
        ],
      });
      return;
    }

    if (head === "all") {
      const reason = args.slice(1).join(" ").trim().slice(0, 450) || `Lockdown — ${message.author.tag}`;
      const list = await textChannelsToLock(guild.id, guild);
      const locked: string[] = [];
      for (const ch of list) {
        if (!me.permissionsIn(ch).has(PermissionFlagsBits.ManageChannels)) continue;
        try {
          await ch.permissionOverwrites.edit(
            guild.roles.everyone.id,
            { SendMessages: false },
            { reason },
          );
          locked.push(ch.id);
        } catch {
          /* skip */
        }
      }
      await getBotPrisma().botGuildLockdownSession.create({
        data: {
          guildId: guild.id,
          channelIds: locked,
          active: true,
        },
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Lockdown (all)",
            description: `Locked **${locked.length}** channel(s). Use **.unlockall** to reverse this session.`,
          }),
        ],
      });
      return;
    }

    if (head === "role") {
      const roleRaw = args[1];
      const roleId =
        roleRaw?.match(/^<@&(\d+)>$/)?.[1] ??
        (/^\d{17,20}$/.test(roleRaw ?? "") ? roleRaw : null);
      const reason = args.slice(2).join(" ").trim().slice(0, 450) || `Lockdown role — ${message.author.tag}`;
      if (!roleId) {
        await message.reply({
          embeds: [errorEmbed("Usage: **.lockdown role** `<@role>` [reason]")],
        });
        return;
      }
      let n = 0;
      const list = await textChannelsToLock(guild.id, guild);
      for (const ch of list) {
        if (!me.permissionsIn(ch).has(PermissionFlagsBits.ManageChannels)) continue;
        try {
          await ch.permissionOverwrites.edit(
            roleId,
            { SendMessages: false },
            { reason },
          );
          n++;
        } catch {
          /* skip */
        }
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Lockdown (role)",
            description: `Applied **SendMessages: deny** for <@&${roleId}> on **${n}** channel(s).`,
          }),
        ],
      });
      return;
    }

    const chId = parseChannelId(message, args[0]) ?? message.channel.id;
    const reason =
      (parseChannelId(message, args[0]) ? args.slice(1) : args)
        .join(" ")
        .trim()
        .slice(0, 450) || `Lockdown — ${message.author.tag}`;
    const ch = await guild.channels.fetch(chId).catch(() => null);
    if (
      !ch ||
      (ch.type !== ChannelType.GuildText &&
        ch.type !== ChannelType.GuildAnnouncement)
    ) {
      await message.reply({ embeds: [errorEmbed("Invalid channel.")] });
      return;
    }
    try {
      await (ch as TextChannel | NewsChannel).permissionOverwrites.edit(
        guild.roles.everyone.id,
        { SendMessages: false },
        { reason },
      );
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Lockdown failed",
            body: "Could not edit channel overwrites.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Locked down",
          description: `${ch} — @everyone cannot send.`,
        }),
      ],
    });
  },
};

export const unlockallCommand: KnifeCommand = {
  name: "unlockall",
  aliases: ["endlockdown", "unlockdown"],
  description:
    "Undo last **lockdown all** session — **Manage Channels**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".unlockall [reason]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageCh(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }
    const guild = message.guild!;
    const me = guild.members.me!;
    const prisma = getBotPrisma();
    const session = await prisma.botGuildLockdownSession.findFirst({
      where: { guildId: guild.id, active: true },
      orderBy: { createdAt: "desc" },
    });
    const reason = args.join(" ").trim().slice(0, 450) || `Unlock all — ${message.author.tag}`;
    const ids: string[] = session?.channelIds
      ? (Array.isArray(session.channelIds)
          ? session.channelIds.filter((x): x is string => typeof x === "string")
          : [])
      : [];
    let n = 0;
    if (ids.length > 0) {
      for (const cid of ids) {
        const ch = await guild.channels.fetch(cid).catch(() => null);
        if (
          !ch ||
          (ch.type !== ChannelType.GuildText &&
            ch.type !== ChannelType.GuildAnnouncement)
        ) {
          continue;
        }
        if (!me.permissionsIn(ch).has(PermissionFlagsBits.ManageChannels)) continue;
        try {
          await (ch as TextChannel | NewsChannel).permissionOverwrites.edit(
            guild.roles.everyone.id,
            { SendMessages: null },
            { reason },
          );
          n++;
        } catch {
          /* skip */
        }
      }
      if (session) {
        await prisma.botGuildLockdownSession.update({
          where: { id: session.id },
          data: { active: false },
        });
      }
    } else {
      const list = [...guild.channels.cache.values()].filter(
        (c) =>
          c.type === ChannelType.GuildText ||
          c.type === ChannelType.GuildAnnouncement,
      );
      for (const ch of list) {
        if (!me.permissionsIn(ch).has(PermissionFlagsBits.ManageChannels)) continue;
        try {
          await (ch as TextChannel | NewsChannel).permissionOverwrites.edit(
            guild.roles.everyone.id,
            { SendMessages: null },
            { reason },
          );
          n++;
        } catch {
          /* skip */
        }
      }
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Unlock all",
          description: `Reset **SendMessages** inherit on **${n}** channel(s).`,
        }),
      ],
    });
  },
};
