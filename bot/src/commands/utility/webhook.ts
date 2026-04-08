import {
  EmbedBuilder,
  PermissionFlagsBits,
  WebhookClient,
  type Guild,
  type Message,
  type Webhook,
} from "discord.js";
import type { APIEmbed } from "discord-api-types/v10";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { guildMemberOrFetch } from "../../lib/discord-member-perms";
import { getBotPrisma } from "../../lib/db-prisma";
import type { KnifeCommand } from "../types";

const MAX_CONTENT = 2000;

function parseDiscordMessageLink(
  raw: string,
): { guildId: string; channelId: string; messageId: string } | null {
  const m = raw.match(
    /discord(?:app)?\.com\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})/i,
  );
  if (!m) return null;
  return { guildId: m[1]!, channelId: m[2]!, messageId: m[3]! };
}

function parseMessageOrEmbedPayload(
  raw: string,
): { content?: string; embeds?: EmbedBuilder[] } {
  const t = raw.trim();
  if (!t) return { content: "\u200b" };
  try {
    const j = JSON.parse(t) as Record<string, unknown>;
    if (j && typeof j === "object") {
      if (Array.isArray(j.embeds)) {
        const embeds = j.embeds
          .filter((x) => x && typeof x === "object")
          .map((x) => new EmbedBuilder(x as APIEmbed));
        if (embeds.length > 0) {
          return {
            content:
              typeof j.content === "string" ? j.content.slice(0, MAX_CONTENT) : undefined,
            embeds,
          };
        }
      }
      if (j.embed && typeof j.embed === "object") {
        return { embeds: [new EmbedBuilder(j.embed as APIEmbed)] };
      }
      if (
        "title" in j ||
        "description" in j ||
        "fields" in j ||
        "color" in j ||
        "footer" in j ||
        "author" in j ||
        "image" in j ||
        "thumbnail" in j
      ) {
        return { embeds: [new EmbedBuilder(j as APIEmbed)] };
      }
      if (typeof j.content === "string") {
        return { content: j.content.slice(0, MAX_CONTENT) };
      }
    }
  } catch {
    /* plain text */
  }
  return { content: t.length > MAX_CONTENT ? t.slice(0, MAX_CONTENT) : t };
}

async function botHasManageWebhooks(guild: Guild): Promise<boolean> {
  return (
    guild.members.me?.permissions.has(PermissionFlagsBits.ManageWebhooks) ??
    false
  );
}

async function fetchGuildWebhooks(guild: Guild): Promise<Webhook[]> {
  const hooks = await guild.fetchWebhooks();
  return [...hooks.values()];
}

function sortWebhooks(a: Webhook, b: Webhook): number {
  const ca = a.channelId ?? "";
  const cb = b.channelId ?? "";
  if (ca !== cb) return ca.localeCompare(cb);
  return a.name.localeCompare(b.name);
}

async function resolveWebhook(
  guild: Guild,
  identifier: string,
  hooks: Webhook[],
): Promise<Webhook | null> {
  const t = identifier.trim();
  if (!t) return null;
  if (/^\d{17,20}$/.test(t)) {
    return hooks.find((w) => w.id === t) ?? null;
  }
  const n = parseInt(t, 10);
  if (Number.isFinite(n) && n >= 1 && n <= hooks.length) {
    return [...hooks].sort(sortWebhooks)[n - 1] ?? null;
  }
  const lower = t.toLowerCase();
  const nameMatches = hooks.filter((w) => w.name.toLowerCase() === lower);
  if (nameMatches.length === 1) return nameMatches[0]!;
  if (nameMatches.length > 1) return null;
  const partial = hooks.filter((w) => w.name.toLowerCase().includes(lower));
  if (partial.length === 1) return partial[0]!;
  return null;
}

async function assertWebhookLockAllows(
  message: Message,
  webhookId: string,
  guildId: string,
): Promise<void> {
  const prisma = getBotPrisma();
  const lock = await prisma.botGuildWebhookLock.findUnique({
    where: { webhookId },
  });
  if (!lock || lock.guildId !== guildId) return;
  if (lock.lockedByUserId === message.author.id) return;
  const mem = await guildMemberOrFetch(message);
  if (mem?.permissions.has(PermissionFlagsBits.Administrator)) return;
  throw new Error("WEBHOOK_LOCKED");
}

function helpEmbed(): EmbedBuilder {
  return minimalEmbed({
    title: "Webhooks",
    description:
      "Set up webhooks in your server.\n\n" +
      "`.webhook create` `name` — create in this channel (Manage Webhooks)\n" +
      "`.webhook list` — webhooks in this server (no member perm)\n" +
      "`.webhook send` `id|name|#` `message…` — post via webhook (JSON for embeds)\n" +
      "`.webhook edit` `messageLink` `message…` — edit a webhook-owned message\n" +
      "`.webhook delete` `id|name|#` — remove webhook\n" +
      "`.webhook lock` `id|name|#` — only you (and admins) use it via Knife\n" +
      "`.webhook unlock` `id|name|#` — remove lock (locker or admin)",
  });
}

export const webhookCommand: KnifeCommand = {
  name: "webhook",
  description:
    "Create, list, send, edit, delete, lock, or unlock channel webhooks (Manage Webhooks where noted)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage:
      ".webhook · .webhook create <name> · .webhook list · .webhook send <id> <msg> · .webhook edit <link> <msg> · .webhook delete <id> · .webhook lock <id> · .webhook unlock <id>",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("**.webhook** only works in a server.")],
      });
      return;
    }

    const guild = message.guild;
    const sub = args[0]?.toLowerCase();

    if (!sub) {
      const mem = await guildMemberOrFetch(message);
      if (!mem?.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
        await message.reply({
          embeds: [
            errorEmbed(
              "You need **Manage Webhooks** for the full **.webhook** overview. Anyone can run **.webhook list** (no member permission).",
            ),
          ],
        });
        return;
      }
      await message.reply({ embeds: [helpEmbed()] });
      return;
    }

    if (sub === "list") {
      if (!(await botHasManageWebhooks(guild))) {
        await message.reply({
          embeds: [
            errorEmbed(
              "I need **Manage Webhooks** in this server to list webhooks.",
            ),
          ],
        });
        return;
      }
      const hooks = (await fetchGuildWebhooks(guild)).sort(sortWebhooks);
      if (hooks.length === 0) {
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Webhooks",
              description: "No webhooks in this server.",
            }),
          ],
        });
        return;
      }
      const prisma = getBotPrisma();
      const locks = await prisma.botGuildWebhookLock.findMany({
        where: { guildId: guild.id },
      });
      const lockByWh = new Map(locks.map((l) => [l.webhookId, l]));
      const lines = await Promise.all(
        hooks.map(async (w, i) => {
          const ch = w.channelId
            ? await guild.channels.fetch(w.channelId).catch(() => null)
            : null;
          const chLabel = ch && "name" in ch && ch.name ? `#${ch.name}` : w.channelId ?? "?";
          const lock = lockByWh.get(w.id);
          const lockNote = lock
            ? ` · locked <@${lock.lockedByUserId}>`
            : "";
          return `**${i + 1}.** \`${w.name}\` · \`${w.id}\` · ${chLabel}${lockNote}`;
        }),
      );
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Webhooks",
            description: lines.join("\n").slice(0, 4000),
          }),
        ],
      });
      return;
    }

    const mem = await guildMemberOrFetch(message);
    if (!mem?.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
      await message.reply({
        embeds: [
          errorEmbed("You need **Manage Webhooks** for this subcommand."),
        ],
      });
      return;
    }

    if (!(await botHasManageWebhooks(guild))) {
      await message.reply({
        embeds: [
          errorEmbed(
            "I need **Manage Webhooks** in this server for webhook commands.",
          ),
        ],
      });
      return;
    }

    const hooks = await fetchGuildWebhooks(guild);
    const prisma = getBotPrisma();

    try {
      if (sub === "create") {
        const name = args.slice(1).join(" ").trim();
        if (!name || name.length > 80) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Usage: **.webhook create** `name` (1–80 characters). Run in the target channel.",
              ),
            ],
          });
          return;
        }
        const ch = message.channel;
        if (!ch.isTextBased() || ch.isDMBased() || !message.guild) {
          await message.reply({
            embeds: [
              errorEmbed("Use **.webhook create** in a text channel in this server."),
            ],
          });
          return;
        }
        if (!("createWebhook" in ch) || typeof ch.createWebhook !== "function") {
          await message.reply({
            embeds: [
              errorEmbed("This channel type cannot hold webhooks."),
            ],
          });
          return;
        }
        const w = await ch.createWebhook({ name, reason: `Knife: ${message.author.tag}` });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Webhook created",
              description: `**${w.name}** · \`${w.id}\` in ${ch}`,
            }),
          ],
        });
        return;
      }

      if (sub === "delete") {
        const idRaw = args.slice(1).join(" ").trim();
        const w = await resolveWebhook(guild, idRaw, hooks);
        if (!w) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Webhook not found. Use **.webhook list** — match **id**, exact **name**, or **#** from the list.",
              ),
            ],
          });
          return;
        }
        await assertWebhookLockAllows(message, w.id, guild.id);
        await w.delete(`Knife: ${message.author.tag}`);
        await prisma.botGuildWebhookLock.deleteMany({ where: { webhookId: w.id } });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Webhook deleted",
              description: `Removed **${w.name}** (\`${w.id}\`).`,
            }),
          ],
        });
        return;
      }

      if (sub === "lock") {
        const idRaw = args.slice(1).join(" ").trim();
        const w = await resolveWebhook(guild, idRaw, hooks);
        if (!w) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Webhook not found. Use **.webhook list** for ids and numbers.",
              ),
            ],
          });
          return;
        }
        await prisma.botGuildWebhookLock.upsert({
          where: { webhookId: w.id },
          create: {
            guildId: guild.id,
            webhookId: w.id,
            lockedByUserId: message.author.id,
          },
          update: { lockedByUserId: message.author.id },
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Webhook locked",
              description: `Only you (and **Administrators**) can use Knife to send, edit, or delete **${w.name}** now.`,
            }),
          ],
        });
        return;
      }

      if (sub === "unlock") {
        const idRaw = args.slice(1).join(" ").trim();
        const w = await resolveWebhook(guild, idRaw, hooks);
        if (!w) {
          await message.reply({
            embeds: [errorEmbed("Webhook not found.")],
          });
          return;
        }
        const lock = await prisma.botGuildWebhookLock.findUnique({
          where: { webhookId: w.id },
        });
        if (!lock) {
          await message.reply({
            embeds: [errorEmbed("That webhook is not locked.")],
          });
          return;
        }
        if (
          lock.lockedByUserId !== message.author.id &&
          !mem.permissions.has(PermissionFlagsBits.Administrator)
        ) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Only the member who locked it or an **Administrator** can unlock.",
              ),
            ],
          });
          return;
        }
        await prisma.botGuildWebhookLock.delete({ where: { webhookId: w.id } });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Webhook unlocked",
              description: `**${w.name}** — anyone with **Manage Webhooks** can use Knife webhook commands again.`,
            }),
          ],
        });
        return;
      }

      if (sub === "send") {
        const idRaw = args[1]?.trim();
        const body = args.slice(2).join(" ").trim();
        if (!idRaw || !body) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Usage: **.webhook send** `webhook id | name | #` `message…` (JSON for embeds)",
              ),
            ],
          });
          return;
        }
        const w = await resolveWebhook(guild, idRaw, hooks);
        if (!w?.token) {
          await message.reply({
            embeds: [errorEmbed("Webhook not found or token unavailable.")],
          });
          return;
        }
        await assertWebhookLockAllows(message, w.id, guild.id);
        const payload = parseMessageOrEmbedPayload(body);
        const client = new WebhookClient({ id: w.id, token: w.token });
        await client.send({
          content: payload.content,
          embeds: payload.embeds,
          username: w.name,
        });
        await client.destroy();
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Sent",
              description: `Posted via webhook **${w.name}**.`,
            }),
          ],
        });
        return;
      }

      if (sub === "edit") {
        const link = args[1]?.trim();
        const body = args.slice(2).join(" ").trim();
        if (!link || !body) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Usage: **.webhook edit** `https://discord.com/channels/…/…/…` `message…` (JSON for embeds)",
              ),
            ],
          });
          return;
        }
        const parsed = parseDiscordMessageLink(link);
        if (!parsed || parsed.guildId !== guild.id) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Invalid message link, or that message is not in this server.",
              ),
            ],
          });
          return;
        }
        const tch = await guild.channels.fetch(parsed.channelId).catch(() => null);
        if (!tch?.isTextBased() || tch.isDMBased()) {
          await message.reply({
            embeds: [errorEmbed("Channel not found.")],
          });
          return;
        }
        const msg = await tch.messages.fetch(parsed.messageId).catch(() => null);
        if (!msg) {
          await message.reply({
            embeds: [errorEmbed("Message not found.")],
          });
          return;
        }
        const whId = msg.webhookId;
        if (!whId) {
          await message.reply({
            embeds: [
              errorEmbed("That message was not sent by a webhook."),
            ],
          });
          return;
        }
        const w = hooks.find((h) => h.id === whId);
        if (!w?.token) {
          await message.reply({
            embeds: [
              errorEmbed(
                "Could not resolve that webhook (missing from this server or no token).",
              ),
            ],
          });
          return;
        }
        await assertWebhookLockAllows(message, w.id, guild.id);
        const payload = parseMessageOrEmbedPayload(body);
        const client = new WebhookClient({ id: w.id, token: w.token });
        await client.editMessage(parsed.messageId, {
          content: payload.content ?? null,
          embeds: payload.embeds,
        });
        await client.destroy();
        await message.reply({
          embeds: [
            minimalEmbed({
              title: "Updated",
              description: "Webhook message edited.",
            }),
          ],
        });
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.message === "WEBHOOK_LOCKED") {
        await message.reply({
          embeds: [
            errorEmbed(
              "This webhook is **locked** to another user. Ask them, or an **Administrator**, to unlock.",
            ),
          ],
        });
        return;
      }
      throw e;
    }

    await message.reply({
      embeds: [
        errorEmbed(
          "Unknown subcommand. Try **.webhook** (Manage Webhooks) or **.webhook list**.",
        ),
      ],
    });
  },
};
