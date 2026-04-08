import type { Message } from "discord.js";
import type { PrismaClient } from "@prisma/client";
import { getBotPrisma } from "./db-prisma";

function gatherCustomEmojiIds(content: string): string[] {
  const out: string[] = [];
  const re = /<a?:\w+:(\d{17,20})>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

async function processHighlights(
  message: Message,
  prisma: PrismaClient,
): Promise<void> {
  if (!message.guildId || !message.guild) return;
  const guildId = message.guildId;
  const contentLower = message.content.toLowerCase();
  if (!contentLower.trim()) return;

  const rows = await prisma.botGuildHighlightKeyword.findMany({
    where: { guildId },
  });
  if (rows.length === 0) return;

  const ignores = await prisma.botGuildHighlightIgnore.findMany({
    where: { guildId },
  });
  const ignoresBySub = new Map<string, typeof ignores>();
  for (const ig of ignores) {
    const list = ignoresBySub.get(ig.subscriberId) ?? [];
    list.push(ig);
    ignoresBySub.set(ig.subscriberId, list);
  }

  const matched = new Map<string, string[]>(); // subscriberId -> keywords

  for (const row of rows) {
    if (row.userId === message.author.id) continue;
    if (!contentLower.includes(row.keyword.toLowerCase())) continue;

    const igList = ignoresBySub.get(row.userId) ?? [];
    let skip = false;
    for (const ig of igList) {
      if (ig.targetType === "member" && ig.targetId === message.author.id) {
        skip = true;
        break;
      }
      if (
        ig.targetType === "channel" &&
        message.channelId &&
        ig.targetId === message.channelId
      ) {
        skip = true;
        break;
      }
      if (ig.targetType === "role") {
        const mem = message.member;
        if (mem?.roles.cache.has(ig.targetId)) {
          skip = true;
          break;
        }
      }
    }
    if (skip) continue;

    const existing = matched.get(row.userId) ?? [];
    existing.push(row.keyword);
    matched.set(row.userId, existing);
  }

  for (const [subscriberId, keywords] of matched) {
    const uniq = [...new Set(keywords)];
    const user = await message.client.users.fetch(subscriberId).catch(() => null);
    if (!user) continue;
    const dm =
      user.dmChannel ??
      (await user.createDM().catch(() => null));
    if (!dm) continue;
    const link = "url" in message && message.url ? message.url : "";
    const preview = message.content.replace(/\s+/g, " ").slice(0, 200);
    const body =
      `**${message.guild.name}** — ${message.channel.toString()}\n` +
      `Keywords: ${uniq.map((k) => `\`${k}\``).join(", ")}\n` +
      (link ? `${link}\n` : "") +
      (preview ? `> ${preview}` : "");
    await dm.send({ content: body }).catch(() => {});
  }
}

/**
 * Best-effort: last-seen, emoji usage stats, highlight DM notifications.
 * Does not run for bot-authored messages (caller should skip).
 */
export async function handleUtilityMessageSideEffects(
  message: Message,
): Promise<void> {
  if (!message.guildId || message.author.bot) return;

  try {
    const prisma = getBotPrisma();

    await prisma.botGuildUserLastSeen.upsert({
      where: {
        guildId_userId: {
          guildId: message.guildId,
          userId: message.author.id,
        },
      },
      create: {
        guildId: message.guildId,
        userId: message.author.id,
        lastSeenAt: new Date(),
      },
      update: { lastSeenAt: new Date() },
    });

    for (const emojiId of gatherCustomEmojiIds(message.content)) {
      await prisma.botGuildEmojiUsage.upsert({
        where: {
          guildId_emojiId: { guildId: message.guildId, emojiId },
        },
        create: { guildId: message.guildId, emojiId, uses: 1 },
        update: { uses: { increment: 1 } },
      });
    }

    await processHighlights(message, prisma);
  } catch {
    /* DATABASE_URL missing or transient DB errors */
  }
}
