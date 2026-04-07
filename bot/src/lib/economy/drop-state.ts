import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Guild,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import { DROP_INTERACTION_PREFIX } from "./config";
import { formatCash } from "./money";

export type DropSession = {
  ownerId: string;
  amount: bigint;
  guildId: string;
  selectedUserId: string;
};

/** Short token → active lucky drop (buttons use `kd:<token>:…`). */
export const dropByToken = new Map<string, DropSession>();

export function pickRandomMember(
  guild: Guild,
  exclude: Set<string>,
): string | null {
  const humans = guild.members.cache.filter(
    (m) => !m.user.bot && !exclude.has(m.id),
  );
  const arr = [...humans.values()];
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)]!.id;
}

export function buildDropEmbed(
  session: DropSession,
  guild: Guild,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xf0b232)
    .setTitle("💰 Lucky drop")
    .setDescription(
      `**${formatCash(session.amount)}** cash up for grabs in **${guild.name}**!\n\n` +
        `🎯 **Selected:** <@${session.selectedUserId}>\n\n` +
        `Use **✅ Confirm** to pay out, **🔄 Reroll** for someone else, or **❌ Cancel**.`,
    );
}

export function dropActionRows(
  token: string,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  return [
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${DROP_INTERACTION_PREFIX}${token}:confirm`)
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId(`${DROP_INTERACTION_PREFIX}${token}:reroll`)
        .setLabel("Reroll")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔄"),
      new ButtonBuilder()
        .setCustomId(`${DROP_INTERACTION_PREFIX}${token}:cancel`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌"),
    ),
  ];
}
