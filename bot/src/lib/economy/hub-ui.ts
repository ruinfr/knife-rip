import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type Client,
  type Guild,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import { getBotPrisma } from "../db-prisma";
import {
  ECON_INTERACTION_PREFIX,
  HUB_PAGE_COUNT,
  HUB_PAGE_LABELS,
} from "./config";
import { formatCash, maxBetForBalance } from "./money";
import { getCash } from "./wallet";

const HUB_COLOR = 0x57f287;

function btnId(uid: string, ...parts: string[]): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:${parts.join(":")}`;
}

export async function buildGambleHubPayload(params: {
  client: Client;
  userId: string;
  page: number;
  guild: Guild | null;
}): Promise<{ embeds: EmbedBuilder[]; components: ActionRowBuilder<MessageActionRowComponentBuilder>[] }> {
  const { client, userId, page, guild } = params;
  const p = Math.max(0, Math.min(HUB_PAGE_COUNT - 1, page));
  const cash = await getCash(userId);
  const maxBet = maxBetForBalance(cash);
  const user = await client.users.fetch(userId).catch(() => null);
  const tag = user ? `${user.username}` : userId;

  let description = `👋 **${tag}**\n\n💵 **Balance:** **${formatCash(cash)}**\n📊 **Max bet (games):** **${formatCash(maxBet)}**\n\n`;

  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

  const navRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(btnId(userId, "pg", String(p), "prev"))
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⬅️"),
    new ButtonBuilder()
      .setCustomId(btnId(userId, "pg", String(p), "next"))
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("➡️"),
  );
  rows.push(navRow);

  if (p === 0) {
    const prisma = getBotPrisma();
    const items = await prisma.economyShopItem.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      take: 25,
    });
    if (items.length === 0) {
      description +=
        "🛒 **Shop**\nNo items are on sale yet — check back later.\n\n_Roles are granted in the Knife hub server._";
    } else {
      description += "🛒 **Shop** — pick an item below, then confirm.\n\n";
      for (const it of items) {
        description += `${it.emoji} **${it.name}** — **${formatCash(BigInt(it.price))}**\n`;
      }
      const select = new StringSelectMenuBuilder()
        .setCustomId(btnId(userId, "pg", String(p), "shop", "sel"))
        .setPlaceholder("🛒 Choose an item to buy…")
        .addOptions(
          items.map((it) => ({
            label: it.name.slice(0, 100),
            description: `${formatCash(BigInt(it.price))} cash`,
            value: it.id,
            emoji: it.emoji || undefined,
          })),
        );
      rows.push(
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          select,
        ),
      );
    }
  } else if (p === 1) {
    description +=
      "🎰 **Games** — fair odds vs the house.\n\n" +
      "🪙 **Coinflip** — double or nothing\n" +
      "🎲 **Dice** — beat the house (ties refund)\n" +
      "🎰 **Slots** — triple / pair pays\n\n" +
      "_Use the buttons and enter your bet._";
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "g", "cf"))
          .setLabel("Coinflip")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🪙"),
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "g", "dc"))
          .setLabel("Dice")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎲"),
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "g", "sl"))
          .setLabel("Slots")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎰"),
      ),
    );
  } else if (p === 2) {
    description +=
      "📊 **Stats** — your global Knife Cash profile.\n\n" +
      "Use the buttons for leaderboards or a fresh balance read.";
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "st", "me"))
          .setLabel("My stats")
          .setStyle(ButtonStyle.Success)
          .setEmoji("📋"),
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "st", "topc"))
          .setLabel("Richest")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🏆"),
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "st", "topg"))
          .setLabel("Top gamblers")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🎯"),
      ),
    );
  } else {
    description +=
      "💸 **Pay** — send cash to another Discord user.\n\n" +
      "⚠️ A small **tax** applies. You cannot pay yourself.\n\n" +
      "🔗 Command: use the button to open the secure form.";
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "pay", "open"))
          .setLabel("Send cash…")
          .setStyle(ButtonStyle.Success)
          .setEmoji("💸"),
      ),
    );
  }

  const embed = new EmbedBuilder()
    .setColor(HUB_COLOR)
    .setTitle(`${HUB_PAGE_LABELS[p]} · Knife Cash`)
    .setDescription(description)
    .setFooter({
      text: `${guild?.name ? `${guild.name} · ` : ""}Page ${p + 1}/${HUB_PAGE_COUNT} · Not real money`,
    });

  return { embeds: [embed], components: rows };
}
