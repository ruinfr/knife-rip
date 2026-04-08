import {
  type MessageReaction,
  PartialMessageReaction,
  PartialUser,
  type User,
} from "discord.js";
import { getBotPrisma } from "./db-prisma";
import { emojiKeyFromEmoji } from "./emoji-key";
import { botCanAssignRole } from "./role-assignment-safety";
import {
  deleteReactionGrant,
  upsertReactionGrant,
} from "./reaction-role-persist";

async function fullReaction(
  reaction: MessageReaction | PartialMessageReaction,
): Promise<MessageReaction | null> {
  if (reaction.partial) {
    try {
      return await reaction.fetch();
    } catch {
      return null;
    }
  }
  return reaction;
}

async function fullUser(user: User | PartialUser): Promise<User | null> {
  if (user.partial) {
    try {
      return await user.fetch();
    } catch {
      return null;
    }
  }
  return user;
}

export async function handleReactionRoleAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  const r = await fullReaction(reaction);
  const u = await fullUser(user);
  if (!r || !u || u.bot) return;

  const msg = r.message;
  if (!msg.guildId || !msg.channelId) return;

  const guild =
    msg.guild ??
    (msg.guildId ? r.client.guilds.cache.get(msg.guildId) : null);
  if (!guild) return;

  const emojiKey = emojiKeyFromEmoji(r.emoji);

  try {
    const prisma = getBotPrisma();
    const row = await prisma.botGuildReactionRole.findFirst({
      where: {
        guildId: guild.id,
        channelId: msg.channelId,
        messageId: msg.id,
        emojiKey,
      },
    });
    if (!row) return;

    const member = await guild.members.fetch(u.id).catch(() => null);
    const role = guild.roles.cache.get(row.roleId);
    if (!member || !role || !botCanAssignRole(role)) return;

    await member.roles.add(role, "Reaction role").catch(() => {});
    await upsertReactionGrant(guild.id, u.id, row.roleId);
  } catch {
    /* optional */
  }
}

export async function handleReactionRoleRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  const r = await fullReaction(reaction);
  const u = await fullUser(user);
  if (!r || !u || u.bot) return;

  const msg = r.message;
  if (!msg.guildId || !msg.channelId) return;

  const guild =
    msg.guild ??
    (msg.guildId ? r.client.guilds.cache.get(msg.guildId) : null);
  if (!guild) return;

  const emojiKey = emojiKeyFromEmoji(r.emoji);

  try {
    const prisma = getBotPrisma();
    const row = await prisma.botGuildReactionRole.findFirst({
      where: {
        guildId: guild.id,
        channelId: msg.channelId,
        messageId: msg.id,
        emojiKey,
      },
    });
    if (!row) return;

    const member = await guild.members.fetch(u.id).catch(() => null);
    const role = guild.roles.cache.get(row.roleId);
    if (!member || !role) return;

    await member.roles.remove(role, "Reaction role removed").catch(() => {});
    await deleteReactionGrant(guild.id, u.id, row.roleId);
  } catch {
    /* optional */
  }
}
