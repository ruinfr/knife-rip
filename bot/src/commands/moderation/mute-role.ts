import {
  ChannelType,
  Colors,
  PermissionFlagsBits,
  type VoiceChannel,
} from "discord.js";
import { BotModCaseKind } from "@prisma/client";
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
  resolveModerationMember,
} from "../../lib/moderation-target";
import type { ArivixCommand } from "../types";
import type { Message } from "discord.js";

async function requireModRoles(message: Message) {
  const g = message.guild;
  if (!g)
    return errorEmbed("Servers only.", { title: "Servers only" });
  const mem =
    message.member ??
    (await g.members.fetch(message.author.id).catch(() => null));
  if (
    !mem?.permissions.has(PermissionFlagsBits.ManageRoles) ||
    !mem?.permissions.has(PermissionFlagsBits.ModerateMembers)
  ) {
    return missingPermissionEmbed("you", "Manage Roles and Moderate Members");
  }
  return null;
}

async function getMutedRoleId(guildId: string): Promise<string | null> {
  const row = await getBotPrisma().botGuildMuteConfig.findUnique({
    where: { guildId },
  });
  return row?.mutedRoleId ?? null;
}

export const setupmuteCommand: ArivixCommand = {
  name: "setupmute",
  aliases: ["mutedrole", "createsmute"],
  description:
    "Create a **Muted** role (Manage Roles + Manage Channels)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".setupmute",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
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
    if (
      !mem?.permissions.has(PermissionFlagsBits.ManageRoles) ||
      !mem?.permissions.has(PermissionFlagsBits.ManageChannels)
    ) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Roles + Manage Channels")],
      });
      return;
    }
    const me = g.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await message.reply({
        embeds: [missingPermissionEmbed("bot", "Manage Roles")],
      });
      return;
    }

    const existing = await getMutedRoleId(g.id);
    if (existing) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Mute role",
            description: `Already set: <@&${existing}>`,
          }),
        ],
      });
      return;
    }

    try {
      const role = await g.roles.create({
        name: "Muted",
        color: Colors.Grey,
        reason: `Arivix setupmute — ${message.author.tag}`,
      });
      await getBotPrisma().botGuildMuteConfig.create({
        data: { guildId: g.id, mutedRoleId: role.id },
      });
      for (const [, ch] of g.channels.cache) {
        if (!me.permissionsIn(ch).has(PermissionFlagsBits.ManageChannels)) continue;
        if (
          ch.type === ChannelType.GuildText ||
          ch.type === ChannelType.GuildAnnouncement
        ) {
          await (ch as import("discord.js").TextChannel).permissionOverwrites
            .edit(role.id, { SendMessages: false }, { reason: "Muted role deny" })
            .catch(() => {});
        } else if (
          ch.type === ChannelType.GuildVoice ||
          ch.type === ChannelType.GuildStageVoice
        ) {
          await (ch as VoiceChannel).permissionOverwrites
            .edit(role.id, { Speak: false }, { reason: "Muted role deny" })
            .catch(() => {});
        }
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Mute setup",
            description: `Created ${role} — applied **Send/Speak deny** where I can manage channels.`,
          }),
        ],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await message.reply({
        embeds: [errorEmbed(`Setup failed: ${msg.slice(0, 300)}`)],
      });
    }
  },
};

async function roleMuteRun(
  message: Message,
  args: string[],
  add: boolean,
  kind: BotModCaseKind,
): Promise<void> {
  const deny = await requireModRoles(message);
  if (deny) {
    await message.reply({ embeds: [deny] });
    return;
  }
  const mutedId = await getMutedRoleId(message.guild!.id);
  if (!mutedId) {
    await message.reply({
      embeds: [errorEmbed("Run **.setupmute** first.")],
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

  const reason =
    resolved.tailArgs.join(" ").trim().slice(0, 450) ||
    `${add ? "Muted" : "Unmuted"} (role) by ${message.author.tag}`;
  const muteRole = message.guild!.roles.cache.get(mutedId) ?? (await message.guild!.roles.fetch(mutedId).catch(() => null));
  if (!muteRole || muteRole.position >= me.roles.highest.position) {
    await message.reply({
      embeds: [errorEmbed("Move **Arivix** above the **Muted** role.")],
    });
    return;
  }

  try {
    if (add) {
      await target.roles.add(mutedId, reason);
    } else {
      await target.roles.remove(mutedId, reason);
    }
  } catch {
    await message.reply({
      embeds: [
        actionableErrorEmbed({
          title: "Role mute failed",
          body: "Discord blocked the role change.",
          linkPermissionsDoc: true,
        }),
      ],
    });
    return;
  }

  await createModCase({
    guildId: message.guild!.id,
    kind,
    actorUserId: message.author.id,
    targetUserId: target.id,
    reason,
  });

  await message.reply({
    embeds: [
      minimalEmbed({
        title: add ? "Muted (role)" : "Unmuted (role)",
        description: `**${target.user.tag}** ${add ? "received" : "lost"} ${muteRole}.`,
      }),
    ],
  });
}

export const rmuteCommand: ArivixCommand = {
  name: "rmute",
  aliases: ["imute"],
  description: "Apply **Muted** role — **Manage Roles** + **Moderate Members**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".rmute @user [reason] (`.timeout` / `.mute` = Discord timeout)",
    tier: "free",
    style: "prefix",
  },
  async run(ctx) {
    await roleMuteRun(ctx.message, ctx.args, true, BotModCaseKind.MUTE);
  },
};

export const runmuteCommand: ArivixCommand = {
  name: "runmute",
  aliases: ["iunmute"],
  description: "Remove **Muted** role — **Manage Roles** + **Moderate Members**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".runmute @user [reason]",
    tier: "free",
    style: "prefix",
  },
  async run(ctx) {
    await roleMuteRun(ctx.message, ctx.args, false, BotModCaseKind.UNMUTE_ROLE);
  },
};
