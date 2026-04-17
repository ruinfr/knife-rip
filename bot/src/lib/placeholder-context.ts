import type { Message } from "discord.js";
import type { ArivixEmbedPlaceholderContext } from "../../../lib/embed-script";

export function buildPlaceholderContextFromMessage(
  message: Message,
): ArivixEmbedPlaceholderContext {
  const a = message.author;
  const g = message.guild;
  const mem = message.member;
  const ch = message.channel;

  const tag =
    "discriminator" in a && a.discriminator && a.discriminator !== "0"
      ? `${a.username}#${a.discriminator}`
      : a.username;

  const ctx: ArivixEmbedPlaceholderContext = {
    message: {
      id: message.id,
      content: message.content,
      createdTimestamp: message.createdTimestamp,
      url: message.url,
    },
    user: {
      id: a.id,
      username: a.username,
      globalName: "globalName" in a ? (a.globalName ?? null) : null,
      tag,
      bot: a.bot,
      createdTimestamp: a.createdTimestamp,
      avatarUrl: a.displayAvatarURL({ size: 256 }),
      bannerUrl:
        "bannerURL" in a ? (a.bannerURL({ size: 1024 }) ?? null) : null,
    },
  };

  if (mem && g) {
    const roleMentions = [...mem.roles.cache.values()]
      .filter((r) => r.id !== g.id)
      .map((r) => `<@&${r.id}>`)
      .join(" ");
    ctx.member = {
      id: mem.id,
      displayName: mem.displayName,
      nickname: mem.nickname,
      joinedTimestamp: mem.joinedTimestamp ?? null,
      roles: roleMentions || "—",
      roleCount: Math.max(0, mem.roles.cache.size - 1),
      avatarUrl: mem.displayAvatarURL({ size: 256 }),
    };
  }

  if (g) {
    ctx.guild = {
      id: g.id,
      name: g.name,
      iconUrl: g.iconURL({ size: 256 }),
      memberCount: g.memberCount,
      ownerId: g.ownerId,
      createdTimestamp: g.createdTimestamp,
      premiumTier: g.premiumTier,
      premiumSubscriptionCount: g.premiumSubscriptionCount ?? null,
    };
  }

  if (ch.isTextBased() && !ch.isDMBased()) {
    const topic =
      "topic" in ch && typeof ch.topic === "string" ? ch.topic : null;
    const parentId =
      "parentId" in ch && typeof ch.parentId === "string"
        ? ch.parentId
        : null;
    ctx.channel = {
      id: ch.id,
      name: "name" in ch ? (ch.name ?? null) : null,
      topic,
      isThread: ch.isThread(),
      parentId,
      createdTimestamp: ch.createdTimestamp ?? Date.now(),
    };
  }

  return ctx;
}
