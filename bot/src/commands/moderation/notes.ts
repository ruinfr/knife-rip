import { PermissionFlagsBits } from "discord.js";
import { getBotPrisma } from "../../lib/db-prisma";
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

export const notesCommand: KnifeCommand = {
  name: "notes",
  aliases: ["modnotes", "staffnotes"],
  description: "Staff notes on a member — **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".notes @user · add · remove `<id>` · clear",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const deny = await requireManageMessages(message);
    if (deny) {
      await message.reply({ embeds: [deny] });
      return;
    }

    const guild = message.guild!;
    const prisma = getBotPrisma();
    const head = args[0]?.toLowerCase();

    if (head === "add") {
      const resolved = await resolveModerationMember(message, args.slice(1));
      if (!resolved.ok) {
        await message.reply({ embeds: [resolved.embed] });
        return;
      }
      const body = resolved.tailArgs.join(" ").trim().slice(0, 1500);
      if (!body) {
        await message.reply({
          embeds: [errorEmbed("Usage: **.notes add** `@user` `<note text>`")],
        });
        return;
      }
      await prisma.botGuildMemberNote.create({
        data: {
          guildId: guild.id,
          userId: resolved.member.id,
          authorId: message.author.id,
          body,
        },
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Note added",
            description: `For **${resolved.member.user.tag}**`,
          }),
        ],
      });
      return;
    }

    if (head === "remove") {
      const id = args[1]?.trim();
      if (!id) {
        await message.reply({
          embeds: [errorEmbed("Usage: **.notes remove** `<note id>`")],
        });
        return;
      }
      const row = await prisma.botGuildMemberNote.findFirst({
        where: { id, guildId: guild.id },
      });
      if (!row) {
        await message.reply({ embeds: [errorEmbed("Note not found.")] });
        return;
      }
      await prisma.botGuildMemberNote.delete({ where: { id } });
      await message.reply({
        embeds: [minimalEmbed({ title: "Note removed", description: `\`${id}\`` })],
      });
      return;
    }

    if (head === "clear") {
      const resolved = await resolveModerationMember(message, args.slice(1));
      if (!resolved.ok) {
        await message.reply({ embeds: [resolved.embed] });
        return;
      }
      const adm =
        message.member?.permissions.has(PermissionFlagsBits.Administrator) ??
        false;
      if (!adm) {
        await message.reply({
          embeds: [missingPermissionEmbed("you", "Administrator")],
        });
        return;
      }
      const r = await prisma.botGuildMemberNote.deleteMany({
        where: { guildId: guild.id, userId: resolved.member.id },
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Notes cleared",
            description: `Removed **${r.count}** note(s) for **${resolved.member.user.tag}**.`,
          }),
        ],
      });
      return;
    }

    const resolved = await resolveModerationMember(message, args);
    if (!resolved.ok) {
      await message.reply({ embeds: [resolved.embed] });
      return;
    }
    const rows = await prisma.botGuildMemberNote.findMany({
      where: { guildId: guild.id, userId: resolved.member.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    if (rows.length === 0) {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Notes",
            description: `_No notes for **${resolved.member.user.tag}**._`,
          }),
        ],
      });
      return;
    }
    const lines = rows.map(
      (n) =>
        `\`${n.id.slice(0, 8)}…\` · <t:${Math.floor(n.createdAt.getTime() / 1000)}:R> — ${n.body.slice(0, 120)}`,
    );
    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Notes — ${resolved.member.user.tag}`,
          description: lines.join("\n").slice(0, 3900),
        }),
      ],
    });
  },
};
