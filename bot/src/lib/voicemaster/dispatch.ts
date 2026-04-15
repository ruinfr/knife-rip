import {
  ChannelType,
  PermissionFlagsBits,
  type GuildMember,
  type Message,
} from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { minimalEmbed } from "../embeds";
import { buildPanelPayload } from "./panel-ui";
import {
  VM_CATEGORY_NAME,
  VM_HUB_NAME,
  VM_PANEL_NAME,
  applyGhost,
  applyLock,
  applyNameTemplate,
  applyUnlock,
  applyUnghost,
  clampBitrate,
  deleteGuildConfigRow,
  getGuildConfig,
  getGuildConfig as fetchConfig,
  getTempByChannel,
  isAdministrator,
  ownerCanControl,
  ownerStillInChannel,
  permitTarget,
  rejectTarget,
  savePanelMessageId,
  setTempStatus,
  transferOwnership,
} from "./service";

function parseSnowflake(raw: string): string | null {
  const chM = raw.match(/^<#(\d+)>$/);
  if (chM) return chM[1];
  const roleM = raw.match(/^<@&(\d+)>$/);
  if (roleM) return roleM[1];
  const userM = raw.match(/^<@!?(\d+)>$/);
  if (userM) return userM[1];
  if (/^\d{17,20}$/.test(raw)) return raw;
  return null;
}

function parseBool(v: string | undefined): boolean | null {
  if (!v) return null;
  const x = v.toLowerCase();
  if (["on", "true", "yes", "1", "enable"].includes(x)) return true;
  if (["off", "false", "no", "0", "disable"].includes(x)) return false;
  return null;
}

async function sendSetupPanel(message: Message, guildId: string): Promise<void> {
  const cfg = await fetchConfig(guildId);
  if (!cfg) return;
  const ch = await message.guild!.channels.fetch(cfg.panelChannelId).catch(() => null);
  if (!ch?.isTextBased()) return;
  if (cfg.panelMessageId) {
    const old = await ch.messages.fetch(cfg.panelMessageId).catch(() => null);
    await old?.delete().catch(() => {});
  }
  const msg = await ch.send(buildPanelPayload(0));
  await savePanelMessageId(guildId, msg.id);
}

async function getVoiceTemp(member: GuildMember) {
  const vc = member.voice.channel;
  if (!vc?.isVoiceBased()) return null;
  const temp = await getTempByChannel(vc.id);
  if (!temp) return null;
  return { voice: vc, temp };
}

export async function dispatchVoicemaster(
  message: Message,
  args: string[],
): Promise<void> {
  const guild = message.guild;
  const member = message.member;
  if (!guild || !member) {
    await message.reply("Use VoiceMaster in a server.");
    return;
  }

  const prisma = getBotPrisma();
  const sub = (args[0] ?? "").toLowerCase();
  const rest = args.slice(1);

  if (!sub || sub === "help") {
    const embed = minimalEmbed({
      title: "VoiceMaster",
      description:
        "Temporary voice channels from a hub. Main command: **`.voicemaster`** — alias: **`.vm`**.\n\n" +
        "Setup: **`.voicemaster setup`** (Administrator) — creates a category, hub VC, and this panel.\n" +
        "Glued: **`.vmsetup`**, **`.vmlock`**, **`.vmjoinrole`**, etc.\n\n" +
        "See the pinned-style panel in **#" +
        VM_PANEL_NAME +
        "** after setup, or **`/commands`** on the site.",
    });
    await message.reply({ embeds: [embed] });
    return;
  }

  if (sub === "setup" || sub === "voicemastersetup") {
    if (!isAdministrator(member)) {
      await message.reply("**Administrator** is required for `.voicemaster setup`.");
      return;
    }
    const existing = await fetchConfig(guild.id);
    if (existing) {
      await message.reply(
        "VoiceMaster is already configured. Run **`.voicemaster reset`** (Administrator) first if you want a clean reinstall.",
      );
      return;
    }
    const category = await guild.channels.create({
      name: VM_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });
    const hub = await guild.channels.create({
      name: VM_HUB_NAME,
      type: ChannelType.GuildVoice,
      parent: category.id,
      bitrate: Math.min(64000, guild.maximumBitrate),
    });
    const panel = await guild.channels.create({
      name: VM_PANEL_NAME,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: "VoiceMaster controls — pagination buttons below.",
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow:
            PermissionFlagsBits.ViewChannel |
            PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.ReadMessageHistory,
        },
      ],
    });

    await prisma.voiceMasterGuildConfig.create({
      data: {
        guildId: guild.id,
        hubChannelId: hub.id,
        panelChannelId: panel.id,
        categoryId: category.id,
      },
    });

    await sendSetupPanel(message, guild.id);
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "VoiceMaster installed",
          description:
            `**Category:** ${category.name}\n**Hub:** ${hub.name}\n**Panel:** ${panel}\n\n` +
            `Join **${hub.name}** to spawn your own voice channel.`,
        }),
      ],
    });
    return;
  }

  if (sub === "reset") {
    if (!isAdministrator(member)) {
      await message.reply("**Administrator** is required for `.voicemaster reset`.");
      return;
    }
    const cfg = await fetchConfig(guild.id);
    if (!cfg) {
      await message.reply("VoiceMaster isn’t configured on this server.");
      return;
    }
    const temps = await prisma.voiceMasterTempChannel.findMany({
      where: { guildId: guild.id },
    });
    for (const t of temps) {
      const c = await guild.channels.fetch(t.channelId).catch(() => null);
      if (c) await c.delete().catch(() => {});
    }
    for (const id of [cfg.hubChannelId, cfg.panelChannelId]) {
      const c = await guild.channels.fetch(id).catch(() => null);
      if (c) await c.delete().catch(() => {});
    }
    if (cfg.privateCategoryId) {
      const pc = await guild.channels.fetch(cfg.privateCategoryId).catch(() => null);
      if (pc) await pc.delete().catch(() => {});
    }
    const cat = await guild.channels.fetch(cfg.categoryId).catch(() => null);
    if (cat) await cat.delete().catch(() => {});
    await deleteGuildConfigRow(guild.id);
    await message.reply("VoiceMaster configuration and channels were removed.");
    return;
  }

  if (
    (sub === "join" && rest[0]?.toLowerCase() === "role") ||
    sub === "role"
  ) {
    if (!isAdministrator(member)) {
      await message.reply(
        "**Administrator** is required for **`.voicemaster join role`** / **`.voicemaster role`**.",
      );
      return;
    }
    const cfg = await fetchConfig(guild.id);
    if (!cfg) {
      await message.reply("VoiceMaster isn’t configured.");
      return;
    }
    const raw =
      sub === "join" ? rest.slice(1).join(" ").trim() : rest.join(" ").trim();
    const id =
      message.mentions.roles.first()?.id ?? parseSnowflake(raw.trim());
    if (!id) {
      await message.reply("Mention a **role** or pass its ID (`join role @Mods`).");
      return;
    }
    const role = await guild.roles.fetch(id).catch(() => null);
    if (!role) {
      await message.reply("Role not found.");
      return;
    }
    await prisma.voiceMasterGuildConfig.update({
      where: { guildId: guild.id },
      data: { joinRoleId: role.id },
    });
    await message.reply(`Join role set to ${role}.`);
    return;
  }

  if (sub === "join") {
    const cfg = await fetchConfig(guild.id);
    if (!cfg) {
      await message.reply(
        "VoiceMaster isn’t set up here yet. Ask an admin to run `.voicemaster setup`.",
      );
      return;
    }
    const hub = await guild.channels.fetch(cfg.hubChannelId).catch(() => null);
    const hubPart = hub ? `${hub}` : `\`${cfg.hubChannelId}\``;
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "VoiceMaster — how to start",
          description:
            `1. Join the hub voice channel: ${hubPart}\n` +
            `2. Arivix will create **your** channel and move you into it.\n` +
            `3. Use **\`.voicemaster\`** (or **\`.vm\`**) for rename, lock, ghost, etc.\n` +
            `4. When everyone leaves your temp channel, it is deleted automatically.`,
        }),
      ],
    });
    return;
  }

  if (sub === "configuration") {
    const cfg = await fetchConfig(guild.id);
    if (!cfg) {
      await message.reply("VoiceMaster isn’t configured.");
      return;
    }
    const vt = await getVoiceTemp(member);
    let extra = "";
    if (vt) {
      extra =
        `\n**Your temp channel** ${vt.voice.name}\n**Owner id:** ${vt.temp.ownerId}\n`;
    }
    await message.reply({
      embeds: [
        minimalEmbed({
          title: "VoiceMaster configuration",
          description:
            `**Guild defaults**\n` +
            `• Name template: \`${cfg.defaultNameTemplate.replace(/`/g, "'")}\`\n` +
            `• Bitrate: ${cfg.defaultBitrate}\n` +
            `• Region: ${cfg.defaultRegion ?? "(auto)"}\n` +
            `• Default role: ${cfg.defaultRoleId ?? "—"}\n` +
            `• Join role: ${cfg.joinRoleId ?? "—"}\n` +
            `• Default interface: ${cfg.defaultInterface}\n` +
            `• Category: \`${cfg.categoryId}\`\n` +
            `• Private category: ${cfg.privateCategoryId ?? "—"}\n` +
            `• Hub: \`${cfg.hubChannelId}\`\n` +
            `• Panel: \`${cfg.panelChannelId}\`\n` +
            extra,
        }),
      ],
    });
    return;
  }

  if (sub === "sendinterface") {
    if (!isAdministrator(member)) {
      await message.reply("**Administrator** is required for **`.voicemaster sendinterface`**.");
      return;
    }
    const cfg = await fetchConfig(guild.id);
    if (!cfg) {
      await message.reply("VoiceMaster isn’t configured.");
      return;
    }
    await sendSetupPanel(message, guild.id);
    await message.reply("Panel message refreshed in the VoiceMaster text channel.");
    return;
  }

  if (sub === "default") {
    if (!isAdministrator(member)) {
      await message.reply("**Administrator** is required for **`voicemaster default`** subcommands.");
      return;
    }
    const cfg = await fetchConfig(guild.id);
    if (!cfg) {
      await message.reply("VoiceMaster isn’t configured.");
      return;
    }
    const dsub = (rest[0] ?? "").toLowerCase();
    const drest = rest.slice(1);

    if (!dsub) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Server defaults",
            description:
              "Use **`.voicemaster default interface on|off`**, **`default role`**, **`default bitrate`**, **`default name`**, **`default region`** (Administrator).",
          }),
        ],
      });
      return;
    }

    if (dsub === "interface") {
      const b = parseBool(drest[0]);
      if (b === null) {
        await message.reply("Use **on** or **off**.");
        return;
      }
      await prisma.voiceMasterGuildConfig.update({
        where: { guildId: guild.id },
        data: { defaultInterface: b },
      });
      await message.reply(`**default interface** → ${b ? "on" : "off"}.`);
      return;
    }

    if (dsub === "role") {
      const raw = drest.join(" ").trim();
      if (raw.toLowerCase() === "clear") {
        await prisma.voiceMasterGuildConfig.update({
          where: { guildId: guild.id },
          data: { defaultRoleId: null },
        });
        await message.reply("**default role** cleared.");
        return;
      }
      const id =
        message.mentions.roles.first()?.id ?? parseSnowflake(raw);
      if (!id) {
        await message.reply("Mention a **role** or ID. Pass **clear** to remove.");
        return;
      }
      const role = await guild.roles.fetch(id).catch(() => null);
      if (!role) {
        await message.reply("Role not found.");
        return;
      }
      await prisma.voiceMasterGuildConfig.update({
        where: { guildId: guild.id },
        data: { defaultRoleId: role.id },
      });
      await message.reply(`**default role** → ${role}.`);
      return;
    }

    if (dsub === "bitrate") {
      const n = Number(drest[0]);
      if (!Number.isFinite(n)) {
        await message.reply("Pass a bitrate number (e.g. `64000`).");
        return;
      }
      const v = clampBitrate(guild, n);
      await prisma.voiceMasterGuildConfig.update({
        where: { guildId: guild.id },
        data: { defaultBitrate: v },
      });
      await message.reply(`**default bitrate** → ${v}.`);
      return;
    }

    if (dsub === "name") {
      const t = drest.join(" ").trim();
      if (!t) {
        await message.reply("Pass a template — use `{user}` for the creator’s name.");
        return;
      }
      await prisma.voiceMasterGuildConfig.update({
        where: { guildId: guild.id },
        data: { defaultNameTemplate: t.slice(0, 200) },
      });
      await message.reply("**default name template** updated.");
      return;
    }

    if (dsub === "region") {
      const r = drest.join(" ").trim();
      if (!r || r.toLowerCase() === "auto" || r === "null") {
        await prisma.voiceMasterGuildConfig.update({
          where: { guildId: guild.id },
          data: { defaultRegion: null },
        });
        await message.reply("**default region** → automatic.");
        return;
      }
      await prisma.voiceMasterGuildConfig.update({
        where: { guildId: guild.id },
        data: { defaultRegion: r.slice(0, 32) },
      });
      await message.reply("**default region** updated (applied to new channels).");
      return;
    }

    await message.reply("Unknown **default** subcommand.");
    return;
  }

  if (sub === "category") {
    if (!isAdministrator(member)) {
      await message.reply("**Administrator** is required.");
      return;
    }
    const cfg = await fetchConfig(guild.id);
    if (!cfg) {
      await message.reply("VoiceMaster isn’t configured.");
      return;
    }
    if (rest[0]?.toLowerCase() === "private") {
      const idRaw = rest.slice(1).join(" ").trim();
      const cid = parseSnowflake(idRaw);
      const target =
        message.mentions.channels.first() ??
        (cid ? await guild.channels.fetch(cid).catch(() => null) : null);
      if (!target || target.type !== ChannelType.GuildCategory) {
        await message.reply("Mention or pass a **category** ID.");
        return;
      }
      await prisma.voiceMasterGuildConfig.update({
        where: { guildId: guild.id },
        data: { privateCategoryId: target.id },
      });
      await message.reply(`**Private category** → ${target.name}.`);
      return;
    }
    const catRaw = rest.join(" ").trim();
    const cid = parseSnowflake(catRaw);
    const target =
      message.mentions.channels.first() ??
      (cid ? await guild.channels.fetch(cid).catch(() => null) : null);
    if (!target || target.type !== ChannelType.GuildCategory) {
      await message.reply("Mention or pass the **category** for new temp channels.");
      return;
    }
    await prisma.voiceMasterGuildConfig.update({
      where: { guildId: guild.id },
      data: { categoryId: target.id },
    });
    await message.reply(`New temp channels will use category **${target.name}**.`);
    return;
  }

  const needTemp = async (): Promise<NonNullable<Awaited<ReturnType<typeof getVoiceTemp>>> | null> => {
    const x = await getVoiceTemp(member);
    if (!x) {
      await message.reply("Join **your** VoiceMaster channel first, or use a server admin command.");
      return null;
    }
    return x;
  };

  if (sub === "claim") {
    const v = member.voice.channel;
    if (!v?.isVoiceBased()) {
      await message.reply("Join the voice channel you want to claim.");
      return;
    }
    const temp = await getTempByChannel(v.id);
    if (!temp) {
      await message.reply("That isn’t a VoiceMaster temp channel.");
      return;
    }
    if (ownerStillInChannel(v, temp.ownerId)) {
      await message.reply("The owner is still in this channel.");
      return;
    }
    await transferOwnership(v.id, member.id);
    await v.permissionOverwrites.edit(temp.ownerId, {
      ManageChannels: null,
      Connect: null,
      ViewChannel: null,
    });
    await v.permissionOverwrites.edit(member.id, {
      ManageChannels: true,
      Connect: true,
      ViewChannel: true,
    });
    await message.reply("You claimed this channel.");
    return;
  }

  if (sub === "transfer") {
    const ctx = await needTemp();
    if (!ctx) return;
    if (!ownerCanControl(member, ctx.temp.ownerId)) {
      await message.reply("You don’t own this channel.");
      return;
    }
    const raw = rest.join(" ");
    const targetId =
      message.mentions.users.first()?.id ?? parseSnowflake(raw.trim());
    if (!targetId || targetId === member.id) {
      await message.reply("Mention a member or pass their user ID.");
      return;
    }
    const other = await guild.members.fetch(targetId).catch(() => null);
    if (!other) {
      await message.reply("Member not found in this server.");
      return;
    }
    const oldOwner = ctx.temp.ownerId;
    await transferOwnership(ctx.voice.id, other.id);
    await ctx.voice.permissionOverwrites.edit(oldOwner, {
      ManageChannels: null,
    });
    await ctx.voice.permissionOverwrites.edit(other.id, {
      ManageChannels: true,
      Connect: true,
      ViewChannel: true,
    });
    await message.reply(`Ownership transferred to ${other}.`);
    return;
  }

  if (sub === "lock") {
    const ctx = await needTemp();
    if (!ctx) return;
    if (!ownerCanControl(member, ctx.temp.ownerId)) {
      await message.reply("You don’t control this channel.");
      return;
    }
    await applyLock(ctx.voice, ctx.temp.ownerId);
    await message.reply("Channel **locked** (connect: owner + permitted only).");
    return;
  }

  if (sub === "unlock") {
    const ctx = await needTemp();
    if (!ctx) return;
    if (!ownerCanControl(member, ctx.temp.ownerId)) {
      await message.reply("You don’t control this channel.");
      return;
    }
    await applyUnlock(ctx.voice, ctx.temp.ownerId);
    await message.reply("Channel **unlocked**.");
    return;
  }

  if (sub === "ghost") {
    const ctx = await needTemp();
    if (!ctx) return;
    if (!ownerCanControl(member, ctx.temp.ownerId)) {
      await message.reply("You don’t control this channel.");
      return;
    }
    const cfg = await getGuildConfig(guild.id);
    if (cfg?.privateCategoryId) {
      await ctx.voice.setParent(cfg.privateCategoryId, { lockPermissions: false });
    }
    await applyGhost(ctx.voice, ctx.temp.ownerId);
    await message.reply("Channel **ghosted** (hidden from most members).");
    return;
  }

  if (sub === "unghost") {
    const ctx = await needTemp();
    if (!ctx) return;
    if (!ownerCanControl(member, ctx.temp.ownerId)) {
      await message.reply("You don’t control this channel.");
      return;
    }
    const cfg = await getGuildConfig(guild.id);
    if (cfg && ctx.voice.parentId === cfg.privateCategoryId) {
      await ctx.voice.setParent(cfg.categoryId, { lockPermissions: false });
    }
    await applyUnghost(ctx.voice, ctx.temp.ownerId);
    await message.reply("Channel **unghosted**.");
    return;
  }

  if (sub === "status") {
    const ctx = await needTemp();
    if (!ctx) return;
    if (!ownerCanControl(member, ctx.temp.ownerId)) {
      await message.reply("You don’t control this channel.");
      return;
    }
    const label = rest.join(" ").trim() || null;
    await setTempStatus(ctx.voice.id, label);
    const cfg = await getGuildConfig(guild.id);
    const ownerMember = await guild.members
      .fetch(ctx.temp.ownerId)
      .catch(() => null);
    const base =
      cfg && ownerMember
        ? applyNameTemplate(cfg.defaultNameTemplate, ownerMember)
        : (ctx.voice.name.split(" · ")[0] ?? ctx.voice.name);
    const nextName = label ? `${base} · ${label}`.slice(0, 100) : base;
    await ctx.voice.setName(nextName).catch(() => {});
    await message.reply(label ? `Status set — channel renamed.` : "Status cleared.");
    return;
  }

  if (sub === "name") {
    const ctx = await needTemp();
    if (!ctx) return;
    if (!ownerCanControl(member, ctx.temp.ownerId)) {
      await message.reply("You don’t control this channel.");
      return;
    }
    const newName = rest.join(" ").trim();
    if (!newName) {
      await message.reply("Pass the new channel name.");
      return;
    }
    await ctx.voice.setName(newName.slice(0, 100)).catch(() => {});
    await message.reply("Channel renamed.");
    return;
  }

  if (sub === "limit") {
    const ctx = await needTemp();
    if (!ctx) return;
    if (!ownerCanControl(member, ctx.temp.ownerId)) {
      await message.reply("You don’t control this channel.");
      return;
    }
    const n = Number(rest[0]);
    if (!Number.isFinite(n) || n < 0 || n > 99) {
      await message.reply("Pass a number **0–99** (0 = no limit).");
      return;
    }
    await ctx.voice.setUserLimit(n).catch(() => {});
    await message.reply(`User limit → **${n}**.`);
    return;
  }

  if (sub === "bitrate") {
    const ctx = await needTemp();
    if (!ctx) return;
    if (!ownerCanControl(member, ctx.temp.ownerId)) {
      await message.reply("You don’t control this channel.");
      return;
    }
    const n = Number(rest[0]);
    if (!Number.isFinite(n)) {
      await message.reply("Pass bitrate (e.g. `64000`).");
      return;
    }
    const v = clampBitrate(guild, n);
    await ctx.voice.setBitrate(v).catch(() => {});
    await message.reply(`Bitrate → **${v}**.`);
    return;
  }

  if (sub === "permit" || sub === "reject") {
    const ctx = await needTemp();
    if (!ctx) return;
    if (!ownerCanControl(member, ctx.temp.ownerId)) {
      await message.reply("You don’t control this channel.");
      return;
    }
    const raw = rest.join(" ").trim();
    const mentionRole = message.mentions.roles.first();
    const mentionUser = message.mentions.users.first();
    const id = mentionRole?.id ?? mentionUser?.id ?? parseSnowflake(raw);
    let role = mentionRole ?? null;
    let mem = mentionUser
      ? await guild.members.fetch(mentionUser.id).catch(() => null)
      : null;
    if (id && !role && !mem) {
      role = await guild.roles.fetch(id).catch(() => null);
      if (!role) {
        mem = await guild.members.fetch(id).catch(() => null);
      }
    }
    if (role) {
      if (sub === "permit") {
        await permitTarget(ctx.voice, role.id);
      } else {
        await rejectTarget(ctx.voice, role.id);
      }
      await message.reply(`Role ${role.name} → **${sub}**.`);
      return;
    }
    if (mem) {
      if (sub === "permit") {
        await permitTarget(ctx.voice, mem.id);
      } else {
        await rejectTarget(ctx.voice, mem.id);
      }
      await message.reply(`Member **${mem.user.tag}** → **${sub}**.`);
      return;
    }
    await message.reply("Mention a **member** or **role**, or pass a snowflake ID.");
    return;
  }

  await message.reply({
    embeds: [
      minimalEmbed({
        title: "VoiceMaster",
        description:
          `Unknown subcommand \`${sub}\`. Try **.voicemaster help** or **.vmsetup** (Administrator).`,
      }),
    ],
  });
}
