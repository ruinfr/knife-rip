import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type Message,
} from "discord.js";
import { minimalEmbed, errorEmbed, missingPermissionEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import type { KnifeCommand } from "../types";

async function requireAdministrator(message: Message) {
  const g = message.guild;
  if (!g) return errorEmbed("Use this in a server channel.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (!mem?.permissions.has(PermissionFlagsBits.Administrator)) {
    return missingPermissionEmbed("you", "Administrator");
  }
  return null;
}

export const jailsetupCommand: KnifeCommand = {
  name: "jailsetup",
  aliases: ["setupjail", "jset"],
  description:
    "Create Jail category, Jailed role, #jail and #jail-logs (Administrator only)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".jailsetup — run once per server; idempotent",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const deny = await requireAdministrator(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const guild = message.guild!;
    const prisma = getBotPrisma();
    const existing = await prisma.botGuildJailConfig.findUnique({
      where: { guildId: guild.id },
    });
    if (existing) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Jail already configured",
            description:
              `**Jail role:** <@&${existing.jailRoleId}>\n` +
              `**#jail:** <#${existing.jailChannelId}>\n` +
              `**#jail-logs:** <#${existing.logChannelId}>\n\n` +
              `_Delete these in Discord first if you need to re-run setup from scratch._`,
          }),
        ],
      });
      return;
    }

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await message.reply({
        embeds: [
          errorEmbed("I need **Manage Channels** to create the jail category."),
        ],
      });
      return;
    }
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await message.reply({
        embeds: [errorEmbed("I need **Manage Roles** to create the Jailed role.")],
      });
      return;
    }

    const actor =
      message.member ??
      (await guild.members.fetch(message.author.id).catch(() => null));

    let staffAccessRoleId: string | null = null;
    const highest = actor?.roles.highest;
    if (
      highest &&
      highest.id !== guild.id &&
      highest.position < me.roles.highest.position
    ) {
      staffAccessRoleId = highest.id;
    }

    const botUserId = message.client.user.id;

    const viewSend = PermissionFlagsBits.ViewChannel |
      PermissionFlagsBits.SendMessages |
      PermissionFlagsBits.ReadMessageHistory;

    try {
      const category = await guild.channels.create({
        name: "Jail",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id,
            type: OverwriteType.Role,
            deny: PermissionFlagsBits.ViewChannel,
          },
          {
            id: botUserId,
            type: OverwriteType.Member,
            allow:
              PermissionFlagsBits.ViewChannel |
              PermissionFlagsBits.SendMessages |
              PermissionFlagsBits.ReadMessageHistory |
              PermissionFlagsBits.ManageChannels |
              PermissionFlagsBits.ManageMessages,
          },
          ...(staffAccessRoleId
            ? [
                {
                  id: staffAccessRoleId,
                  type: OverwriteType.Role as const,
                  allow: viewSend,
                },
              ]
            : []),
        ],
      });

      const jailRole = await guild.roles.create({
        name: "Jailed",
        color: 0x546e7a,
        mentionable: false,
        reason: "Arivix jail setup",
      });

      const jailChannel = await guild.channels.create({
        name: "jail",
        type: ChannelType.GuildText,
        parent: category.id,
        topic: "Jailed members can speak here until staff run .unjail",
        permissionOverwrites: [
          {
            id: guild.id,
            type: OverwriteType.Role,
            deny: PermissionFlagsBits.ViewChannel,
          },
          {
            id: jailRole.id,
            type: OverwriteType.Role,
            allow: viewSend,
          },
          {
            id: botUserId,
            type: OverwriteType.Member,
            allow:
              PermissionFlagsBits.ViewChannel |
              PermissionFlagsBits.SendMessages |
              PermissionFlagsBits.ReadMessageHistory |
              PermissionFlagsBits.ManageMessages,
          },
          ...(staffAccessRoleId
            ? [
                {
                  id: staffAccessRoleId,
                  type: OverwriteType.Role as const,
                  allow: viewSend,
                },
              ]
            : []),
        ],
      });

      const logChannel = await guild.channels.create({
        name: "jail-logs",
        type: ChannelType.GuildText,
        parent: category.id,
        topic: "Audit log for .jail / .unjail",
        permissionOverwrites: [
          {
            id: guild.id,
            type: OverwriteType.Role,
            deny: PermissionFlagsBits.ViewChannel,
          },
          {
            id: botUserId,
            type: OverwriteType.Member,
            allow:
              PermissionFlagsBits.ViewChannel |
              PermissionFlagsBits.SendMessages |
              PermissionFlagsBits.ReadMessageHistory |
              PermissionFlagsBits.ManageMessages,
          },
          ...(staffAccessRoleId
            ? [
                {
                  id: staffAccessRoleId,
                  type: OverwriteType.Role as const,
                  allow:
                    PermissionFlagsBits.ViewChannel |
                    PermissionFlagsBits.ReadMessageHistory,
                },
              ]
            : []),
        ],
      });

      await prisma.botGuildJailConfig.create({
        data: {
          guildId: guild.id,
          jailRoleId: jailRole.id,
          jailChannelId: jailChannel.id,
          logChannelId: logChannel.id,
          categoryId: category.id,
          staffAccessRoleId,
        },
      });

      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Jail system ready",
            description:
              `**Role:** <@&${jailRole.id}>\n` +
              `**Channel:** ${jailChannel}\n` +
              `**Logs:** ${logChannel}\n\n` +
              `Use **\`.jail\`** @user to jail, **\`.unjail\`** to release, **\`.jaillist\`** to list.\n` +
              (staffAccessRoleId
                ? `_Your top role can see these channels._\n`
                : `_Give yourself a role under Arivix, then re-invite mods or adjust overwrites so staff can see logs._\n`) +
              `_Move **Arivix’s** role **above** **Jailed** in Server Settings → Roles._`,
          }),
        ],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await message.reply({
        embeds: [
          errorEmbed(
            `Setup failed: ${msg.slice(0, 350)}\n\n_Check bot role position and **Manage Channels / Manage Roles**._`,
          ),
        ],
      });
    }
  },
};
