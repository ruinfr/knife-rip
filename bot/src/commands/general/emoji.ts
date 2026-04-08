import { type Client, parseEmoji, PermissionFlagsBits } from "discord.js";
import { guildMemberHas } from "../../lib/command-perms";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { getBotPrisma } from "../../lib/db-prisma";
import { fetchImageBuffer } from "../../lib/fetch-image-buffer";
import { parseDiscordMessageUrl } from "../../lib/parse-discord-message-url";
import type { KnifeCommand } from "../types";

const SUBS = new Set([
  "add",
  "remove",
  "removemany",
  "removeduplicates",
  "stats",
  "information",
  "addmany",
  "rename",
]);

function extractEmojiRaw(args: string[], messageContent: string): string | null {
  const joined = args.join(" ").trim();
  const fromArgs = joined.match(/<a?:\w+:\d{17,20}>/);
  if (fromArgs) return fromArgs[0];
  const idOnly = joined.match(/^\d{17,20}$/);
  if (idOnly) return idOnly[0];
  const fromMessage = messageContent.match(/<a?:\w+:\d{17,20}>/);
  if (fromMessage) return fromMessage[0];
  return null;
}

function emojiCdnUrl(id: string, animated: boolean): string {
  const ext = animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${id}.${ext}?size=256`;
}

function resolveAnimatedFromCache(
  client: Client,
  id: string,
): { animated: boolean; name: string } {
  let animated = false;
  let name = "emoji";
  for (const g of client.guilds.cache.values()) {
    const e = g.emojis.cache.get(id);
    if (e) {
      name = e.name ?? name;
      animated = e.animated;
      break;
    }
  }
  return { animated, name };
}

function canManageExpressions(
  message: import("discord.js").Message,
): boolean {
  return guildMemberHas(message, PermissionFlagsBits.ManageGuildExpressions);
}

async function enlargeEmoji(
  message: import("discord.js").Message,
  args: string[],
): Promise<void> {
  const raw = extractEmojiRaw(args, message.content);
  if (!raw) {
    await message.reply({
      embeds: [
        errorEmbed(
          "Usage: **.emoji** `<:name:id>` or **.emoji** `numeric_id`\n" +
            "Tip: paste the emoji from your server’s picker.",
        ),
      ],
    });
    return;
  }

  let id: string;
  let name = "emoji";
  let animated = false;

  if (/^\d{17,20}$/.test(raw)) {
    id = raw;
    const resolved = resolveAnimatedFromCache(message.client, id);
    name = resolved.name;
    animated = resolved.animated;
  } else {
    const parsed = parseEmoji(raw);
    if (!parsed?.id) {
      await message.reply({
        embeds: [errorEmbed("Could not parse that emoji.")],
      });
      return;
    }
    id = parsed.id;
    name = parsed.name ?? name;
    animated = Boolean(parsed.animated);
  }

  const url = emojiCdnUrl(id, animated);

  await message.reply({
    embeds: [
      minimalEmbed({
        title: `:${name}:`,
        description: `**ID:** \`${id}\`\n**[Open image](${url})**`,
        imageUrl: url,
      }),
    ],
  });
}

export const emojiCommand: KnifeCommand = {
  name: "emoji",
  aliases: ["e"],
  description:
    "Show an emoji full size, or manage server emojis (add/remove/rename/…)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Expressions and tools.",
    usage:
      ".emoji <:name:id> · .emoji add <:e:id> name · .emoji stats · .emoji removemany …",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const head = args[0]?.toLowerCase();
    if (head && SUBS.has(head)) {
      await handleEmojiManage(message, head, args.slice(1));
      return;
    }
    await enlargeEmoji(message, args);
  },
};

async function handleEmojiManage(
  message: import("discord.js").Message,
  sub: string,
  rest: string[],
): Promise<void> {
  const guild = message.guild;
  if (!guild) {
    await message.reply({
      embeds: [errorEmbed("Emoji management only works in servers.")],
    });
    return;
  }

  if (sub === "stats" || sub === "information") {
    if (!canManageExpressions(message)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "You need **Manage Expressions** for **.emoji stats / information**.",
          ),
        ],
      });
      return;
    }
  }

  if (
    sub === "remove" ||
    sub === "removemany" ||
    sub === "removeduplicates" ||
    sub === "rename"
  ) {
    if (!canManageExpressions(message)) {
      await message.reply({
        embeds: [
          errorEmbed("You need **Manage Expressions** for that emoji command."),
        ],
      });
      return;
    }
  }

  try {
    if (sub === "add") {
      const raw = extractEmojiRaw(rest, message.content);
      const urlFromRest = rest.find((x) => /^https?:\/\//i.test(x));
      let buf: Buffer | null = null;

      if (urlFromRest) {
        buf = await fetchImageBuffer(urlFromRest).catch(() => null);
      } else if (raw) {
        const p = parseEmoji(raw);
        if (p?.id) {
          const u = emojiCdnUrl(p.id, Boolean(p.animated));
          buf = await fetchImageBuffer(u).catch(() => null);
        }
      }

      const nameArg =
        rest.find((x) => !x.includes("http") && !/<a?:/.test(x)) ??
        rest[rest.length - 1];
      const name =
        nameArg?.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32) || "emoji";

      if (!buf) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Usage: **.emoji add** `https://…` `name` **or** **.emoji add** `<:a:id>` `name`",
            ),
          ],
        });
        return;
      }

      try {
        await guild.emojis.create({
          attachment: buf,
          name,
        });
      } catch {
        await message.reply({
          embeds: [
            errorEmbed(
              "Could not create emoji — slots, permissions, or file type.",
            ),
          ],
        });
        return;
      }

      await message.reply({
        embeds: [
          minimalEmbed({ title: "Emoji added", description: `\`:${name}:\`` }),
        ],
      });
      return;
    }

    if (sub === "addmany") {
      const text = rest.join(" ");
      const hits: string[] = [];
      for (const m of text.matchAll(/<a?:\w+:\d{17,20}>/g)) {
        hits.push(m[0]);
      }
      for (const r of rest) {
        if (/^https?:\/\//i.test(r)) hits.push(r);
      }
      if (hits.length === 0) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Pass several `<:name:id>` tokens or image URLs separated by spaces.",
            ),
          ],
        });
        return;
      }

      let ok = 0;
      for (let i = 0; i < Math.min(hits.length, 15); i++) {
        const h = hits[i];
        let buf: Buffer | null = null;
        if (/^https?:\/\//i.test(h)) {
          buf = await fetchImageBuffer(h).catch(() => null);
        } else {
          const p = parseEmoji(h);
          if (p?.id) {
            const u = emojiCdnUrl(p.id, Boolean(p.animated));
            buf = await fetchImageBuffer(u).catch(() => null);
          }
        }
        if (!buf) continue;
        const base = `e${i}_${Date.now() % 10000}`.slice(0, 32);
        try {
          await guild.emojis.create({
            attachment: buf,
            name: base,
          });
          ok += 1;
        } catch {
          break;
        }
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Bulk add",
            description: `Created **${ok}** / **${hits.length}** (stops on first hard error).`,
          }),
        ],
      });
      return;
    }

    if (sub === "remove") {
      const raw = extractEmojiRaw(rest, message.content);
      if (!raw) {
        await message.reply({
          embeds: [
            errorEmbed("Usage: **.emoji remove** `<:name:id>` or snowflake ID"),
          ],
        });
        return;
      }
      const id = /^\d{17,20}$/.test(raw)
        ? raw
        : parseEmoji(raw)?.id ?? null;
      if (!id) {
        await message.reply({
          embeds: [errorEmbed("Could not parse emoji to remove.")],
        });
        return;
      }
      const em = guild.emojis.cache.get(id);
      if (!em) {
        await message.reply({
          embeds: [errorEmbed("That emoji is not on this server.")],
        });
        return;
      }
      await em.delete().catch(() => {});
      await message.reply({
        embeds: [
          minimalEmbed({ title: "Removed", description: `\`${em.name}\`` }),
        ],
      });
      return;
    }

    if (sub === "removemany") {
      const found = [...rest.join(" ").matchAll(/<a?:\w+:\d{17,20}>/g)].map(
        (m) => m[0],
      );
      if (found.length === 0) {
        await message.reply({
          embeds: [
            errorEmbed("Paste `<:name:id>` tokens for emojis on **this** server."),
          ],
        });
        return;
      }
      let n = 0;
      for (const h of found) {
        const id = parseEmoji(h)?.id;
        if (!id) continue;
        const em = guild.emojis.cache.get(id);
        if (em) {
          await em.delete().catch(() => {});
          n += 1;
        }
      }
      await message.reply({
        embeds: [
          minimalEmbed({ title: "Bulk remove", description: `Deleted **${n}**.` }),
        ],
      });
      return;
    }

    if (sub === "removeduplicates") {
      type GEmoji = import("discord.js").GuildEmoji;
      const buckets = new Map<string, GEmoji[]>();
      for (const em of guild.emojis.cache.values()) {
        const u = em.imageURL();
        const list = buckets.get(u) ?? [];
        list.push(em);
        buckets.set(u, list);
      }
      let removed = 0;
      for (const [, list] of buckets) {
        if (list.length <= 1) continue;
        const [, ...dupes] = list.sort((a, b) => a.name.localeCompare(b.name));
        for (const d of dupes) {
          await d.delete().catch(() => {});
          removed += 1;
        }
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Duplicates",
            description: `Removed **${removed}** duplicate(s) (same CDN URL).`,
          }),
        ],
      });
      return;
    }

    if (sub === "rename") {
      const raw = extractEmojiRaw(rest, message.content);
      const newName = rest
        .filter((x) => !x.includes("<") && !/^\d{17,20}$/.test(x))
        .join("")
        .replace(/[^a-zA-Z0-9_]/g, "")
        .slice(0, 32);
      if (!raw || !newName) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Usage: **.emoji rename** `<:old:id>` `new_name_alphanumeric`",
            ),
          ],
        });
        return;
      }
      const id = parseEmoji(raw)?.id;
      if (!id) {
        await message.reply({
          embeds: [errorEmbed("Could not parse source emoji.")],
        });
        return;
      }
      const em = guild.emojis.cache.get(id);
      if (!em) {
        await message.reply({
          embeds: [errorEmbed("That emoji is not on this server.")],
        });
        return;
      }
      await em.edit({ name: newName }).catch(() => {});
      await message.reply({
        embeds: [
          minimalEmbed({ title: "Renamed", description: `\`:${newName}:\`` }),
        ],
      });
      return;
    }

    if (sub === "stats") {
      const prisma = getBotPrisma();
      const rows = await prisma.botGuildEmojiUsage.findMany({
        where: { guildId: guild.id },
        orderBy: { uses: "desc" },
        take: 10,
      });
      if (rows.length === 0) {
        await message.reply({
          embeds: [
            errorEmbed(
              "No usage tracked yet — stats fill as members send messages with custom emojis.",
            ),
          ],
        });
        return;
      }
      const lines = rows.map((r, i) => {
        const em = guild.emojis.cache.get(r.emojiId);
        const tag = em ? em.toString() : `\`${r.emojiId}\``;
        return `**#${i + 1}** ${tag} — **${r.uses}**`;
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Top emojis (tracked)",
            description: lines.join("\n"),
          }),
        ],
      });
      return;
    }

    if (sub === "information") {
      const link = rest.join(" ").trim();
      const parsed = parseDiscordMessageUrl(link);
      if (!parsed || parsed.guildId !== guild.id) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Paste a **message link** from **this server** to inspect emoji usage in that message.",
            ),
          ],
        });
        return;
      }
      const ch = await guild.channels.fetch(parsed.channelId).catch(() => null);
      if (!ch || !ch.isTextBased()) {
        await message.reply({
          embeds: [errorEmbed("Channel not accessible.")],
        });
        return;
      }
      const msg = await ch.messages.fetch(parsed.messageId).catch(() => null);
      if (!msg) {
        await message.reply({
          embeds: [errorEmbed("Message not found.")],
        });
        return;
      }
      const emojis = [...msg.content.matchAll(/<a?:\w+:(\d{17,20})>/g)].map(
        (m) => m[0],
      );
      if (emojis.length === 0) {
        await message.reply({
          embeds: [
            errorEmbed("That message has no **custom emoji** in its raw text."),
          ],
        });
        return;
      }
      const last = emojis[emojis.length - 1];
      const pe = parseEmoji(last);
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Latest custom emoji in message",
            description: `${last}\nID: \`${pe?.id ?? "?"}\``,
          }),
        ],
      });
      return;
    }
  } catch (e) {
    await message.reply({
      embeds: [errorEmbed(`Emoji command error: ${String(e)}`)],
    });
  }
}
