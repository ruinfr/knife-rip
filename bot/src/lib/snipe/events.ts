import type { Client, Message, PartialMessage } from "discord.js";
import { Events } from "discord.js";
import {
  recordDeleteSnipe,
  recordEditSnipe,
  recordReactionHistoryEvent,
  recordReactionSnipe,
} from "./store";

async function ensureMessage(m: Message | PartialMessage): Promise<Message | null> {
  if (!m.partial) return m as Message;
  try {
    return await m.fetch();
  } catch {
    return null;
  }
}

export function registerSnipeListeners(client: Client): void {
  client.on(Events.MessageDelete, async (message) => {
    try {
      if (!message.guildId) return;
      const chId = message.channelId;
      const full = await ensureMessage(message);
      if (!full) return;
      if (full.author?.bot) return;

      recordDeleteSnipe(chId, {
        authorId: full.author.id,
        authorTag: full.author.tag,
        content: full.content || "*[no text]*",
        attachmentCount: full.attachments.size,
        messageId: full.id,
        at: Date.now(),
      });
    } catch {
      /* ignore */
    }
  });

  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    try {
      if (!newMsg.guildId) return;
      const chId = newMsg.channelId;
      const oldFull = await ensureMessage(oldMsg);
      const newFull = await ensureMessage(newMsg);
      if (!oldFull || !newFull) return;
      if (oldFull.author.bot) return;
      if (oldFull.content === newFull.content) return;

      recordEditSnipe(chId, {
        authorId: oldFull.author.id,
        authorTag: oldFull.author.tag,
        before: oldFull.content || "*[empty]*",
        after: newFull.content || "*[empty]*",
        messageId: newFull.id,
        at: Date.now(),
      });
    } catch {
      /* ignore */
    }
  });

  async function appendReactionHistory(
    reaction:
      | import("discord.js").MessageReaction
      | import("discord.js").PartialMessageReaction,
    user: import("discord.js").User | import("discord.js").PartialUser,
    kind: "add" | "remove",
  ): Promise<void> {
    const msg = await ensureMessage(reaction.message);
    if (!msg?.guildId) return;
    if (msg.author?.bot) return;
    const u = user.partial ? await user.fetch().catch(() => null) : user;
    if (!u || u.bot) return;
    const emojiDisplay = reaction.emoji.toString();
    recordReactionHistoryEvent(msg.channelId, msg.id, {
      type: kind,
      emojiDisplay,
      userId: u.id,
      userTag: u.tag,
      at: Date.now(),
    });
  }

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
      let r = reaction;
      if (reaction.partial) {
        try {
          r = await reaction.fetch();
        } catch {
          return;
        }
      }
      await appendReactionHistory(r, user, "add");
    } catch {
      /* ignore */
    }
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    try {
      if (user.bot) return;

      let r = reaction;
      if (reaction.partial) {
        try {
          r = await reaction.fetch();
        } catch {
          return;
        }
      }

      const msg = await ensureMessage(r.message);
      if (!msg?.guildId) return;
      const chId = msg.channelId;
      if (msg.author?.bot) return;
      const messageAuthorTag = msg.author?.tag ?? "Unknown";

      const emojiDisplay = r.emoji.toString();

      const removerId = user.id;
      if (!removerId) return;

      recordReactionSnipe(chId, {
        emojiDisplay,
        removerId,
        removerTag: user.username ?? user.id,
        messageId: msg.id,
        messageAuthorTag,
        at: Date.now(),
      });
      await appendReactionHistory(r, user, "remove");
    } catch {
      /* ignore */
    }
  });
}
