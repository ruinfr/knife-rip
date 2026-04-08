import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type Message,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import type { BotGuildButtonRole } from "@prisma/client";

export const BUTTON_CUSTOM_PREFIX = "knife:br:" as const;

export function buildButtonCustomId(rowId: string): string {
  return `${BUTTON_CUSTOM_PREFIX}${rowId}`;
}

export function parseButtonRowId(customId: string): string | null {
  if (!customId.startsWith(BUTTON_CUSTOM_PREFIX)) return null;
  return customId.slice(BUTTON_CUSTOM_PREFIX.length) || null;
}

function styleFromInt(n: number): ButtonStyle {
  switch (n) {
    case ButtonStyle.Primary:
      return ButtonStyle.Primary;
    case ButtonStyle.Secondary:
      return ButtonStyle.Secondary;
    case ButtonStyle.Success:
      return ButtonStyle.Success;
    case ButtonStyle.Danger:
      return ButtonStyle.Danger;
    default:
      return ButtonStyle.Secondary;
  }
}

/** Rebuild all ActionRows from DB rows (max 5 buttons × 5 rows). */
export function buildButtonRowsFromDb(
  rows: BotGuildButtonRole[],
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const sorted = [...rows].sort((a, b) => a.sortIndex - b.sortIndex);
  const out: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
  let current: ActionRowBuilder<MessageActionRowComponentBuilder> | null = null;

  for (const r of sorted) {
    if (!current || current.components.length >= 5) {
      current = new ActionRowBuilder<MessageActionRowComponentBuilder>();
      if (out.length >= 5) break;
      out.push(current);
    }
    const btn = new ButtonBuilder()
      .setCustomId(buildButtonCustomId(r.id))
      .setLabel(r.label.slice(0, 80))
      .setStyle(styleFromInt(r.style));
    if (r.emojiJson) {
      try {
        const e = JSON.parse(r.emojiJson) as {
          id?: string;
          name?: string;
          animated?: boolean;
        };
        if (e.id) {
          btn.setEmoji({
            id: e.id,
            name: e.name,
            animated: e.animated,
          });
        } else if (e.name) {
          btn.setEmoji(e.name);
        }
      } catch {
        /* skip bad emoji */
      }
    }
    current.addComponents(btn);
  }
  return out;
}

export async function applyButtonComponentsToMessage(
  message: Message,
  rows: BotGuildButtonRole[],
): Promise<void> {
  const components = buildButtonRowsFromDb(rows);
  await message.edit({ components });
}

export async function rebuildButtonRoleMessage(
  client: Client,
  guildId: string,
  channelId: string,
  messageId: string,
  rowsFromDb: BotGuildButtonRole[],
): Promise<void> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const ch = await guild.channels.fetch(channelId).catch(() => null);
  if (!ch?.isTextBased()) return;
  const msg = await ch.messages.fetch(messageId).catch(() => null);
  if (!msg) return;
  await applyButtonComponentsToMessage(msg, rowsFromDb);
}
