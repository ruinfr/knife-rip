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
import { ECON_INTERACTION_PREFIX, HUB_PAGE_COUNT } from "./config";
import { ecoBtn, ecoM, economyHubPageTitle } from "./custom-emojis";
import { getEnvShopItemsForGuild } from "./economy-guild-config";
import { formatCash } from "./money";
import { getCash } from "./wallet";

const HUB_COLOR = 0x57f287;

function btnId(uid: string, ...parts: string[]): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:${parts.join(":")}`;
}

/** Shown first from `.gamble`; checkmark replaces this message with the full hub. */
export function buildGambleDisclaimerPayload(params: {
  userId: string;
  guild: Guild | null;
}): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
} {
  const { userId, guild } = params;
  const embed = new EmbedBuilder()
    .setColor(0xf0b232)
    .setTitle(`${ecoM.games} Knife Cash — please read`)
    .setDescription(
      "**Knife Cash is not real money.** It’s a pretend balance for fun on Discord.\n\n" +
        "• You **can lose** cash on games — only bet what you’re fine losing.\n" +
        "• This is **not** real-world gambling; there is **no** cash-out or prize value.\n" +
        "• If you’re not old enough to gamble where you live, **don’t use** these games.\n\n" +
        `${ecoM.tablerinfosquarefilled} Press **I understand** below to open the Knife Cash menu.`,
    )
    .setFooter({
      text: `${guild?.name ? `${guild.name} · ` : ""}The button only works for you`,
    });

  const row =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(btnId(userId, "gk", "ok"))
        .setLabel("I understand")
        .setStyle(ButtonStyle.Success)
        .setEmoji(ecoBtn.Confirm),
    );

  return { embeds: [embed], components: [row] };
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
  const user = await client.users.fetch(userId).catch(() => null);
  const tag = user ? `${user.username}` : userId;

  let description = `👋 **${tag}**\n\n${ecoM.wallet} **Balance:** **${formatCash(cash)}**\n${ecoM.stats} **Games:** wager any whole amount up to your balance.\n\n`;

  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

  const navRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(btnId(userId, "pg", String(p), "prev"))
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(ecoBtn.lucidearrowleft),
    new ButtonBuilder()
      .setCustomId(btnId(userId, "pg", String(p), "next"))
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(ecoBtn.lucidearrowright),
  );
  rows.push(navRow);

  if (p === 0) {
    const envItems =
      guild != null ? getEnvShopItemsForGuild(guild.id) : undefined;
    const prisma = getBotPrisma();
    const items =
      envItems ??
      (await prisma.economyShopItem.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        take: 25,
      }));
    if (items.length === 0) {
      description +=
        `${ecoM.shop} **Shop**\nNo items are on sale in this server yet.\n\n_Configure shop roles in the bot environment, or use the default catalog._`;
    } else {
      description += `${ecoM.shop} **Shop** — pick an item below, then confirm.\n\n`;
      for (const it of items) {
        const price =
          typeof it.price === "bigint" ? it.price : BigInt(it.price);
        description += `${it.emoji} **${it.name}** — **${formatCash(price)}**\n`;
      }
      const select = new StringSelectMenuBuilder()
        .setCustomId(btnId(userId, "pg", String(p), "shop", "sel"))
        .setPlaceholder(`${ecoM.shop} Choose an item to buy…`)
        .addOptions(
          items.map((it) => {
            const price =
              typeof it.price === "bigint" ? it.price : BigInt(it.price);
            return {
              label: it.name.slice(0, 100),
              description: `${formatCash(price)} cash`,
              value: it.id,
              emoji: it.emoji?.match(/^<a?:\w+:\d+>$/)
                ? undefined
                : it.emoji || ecoBtn.shop,
            };
          }),
        );
      rows.push(
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          select,
        ),
      );
    }
  } else if (p === 1) {
    description +=
      `${ecoM.games} **Games** — fair odds vs the house.\n\n` +
      `${ecoM.coinflip} **Coinflip** · ${ecoM.dice} **Dice** · ${ecoM.slots} **Slots** — instant\n` +
      `${ecoM.blackjack} **Blackjack** · ${ecoM.mines} **Mines** — interactive (buttons)\n\n` +
      `${ecoM.tablerinfosquarefilled} _Enter your bet; blackjack & mines update this message._`;
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "g", "cf"))
          .setLabel("Coinflip")
          .setStyle(ButtonStyle.Primary)
          .setEmoji(ecoBtn.coinflip),
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "g", "dc"))
          .setLabel("Dice")
          .setStyle(ButtonStyle.Primary)
          .setEmoji(ecoBtn.dice),
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "g", "sl"))
          .setLabel("Slots")
          .setStyle(ButtonStyle.Primary)
          .setEmoji(ecoBtn.slots),
      ),
    );
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "g", "bj"))
          .setLabel("Blackjack")
          .setStyle(ButtonStyle.Primary)
          .setEmoji(ecoBtn.blackjack),
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "g", "mn"))
          .setLabel("Mines")
          .setStyle(ButtonStyle.Primary)
          .setEmoji(ecoBtn.mines),
      ),
    );
  } else if (p === 2) {
    description +=
      `${ecoM.stats} **Stats** — your global Knife Cash profile.\n\n` +
      `${ecoM.rankInStatsMenu} Leaderboards & profile — ${ecoM.topgambler} **Top gamblers** is net profit.`;
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "st", "me"))
          .setLabel("My stats")
          .setStyle(ButtonStyle.Success)
          .setEmoji(ecoBtn.msgs),
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "st", "topc"))
          .setLabel("Richest")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(ecoBtn.toplb),
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "st", "topg"))
          .setLabel("Top gamblers")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(ecoBtn.topgambler),
      ),
    );
  } else {
    description +=
      `${ecoM.pay} **Pay** — send cash to another Discord user.\n\n` +
      `${ecoM.tax} A small **tax** applies. You cannot pay yourself.\n\n` +
      `${ecoM.tablerinfosquarefilled} Use the button to open the secure form.`;
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "pay", "open"))
          .setLabel("Send cash…")
          .setStyle(ButtonStyle.Success)
          .setEmoji(ecoBtn.pay),
      ),
    );
  }

  const embed = new EmbedBuilder()
    .setColor(HUB_COLOR)
    .setTitle(economyHubPageTitle(p))
    .setDescription(description)
    .setFooter({
      text: `${guild?.name ? `${guild.name} · ` : ""}Page ${p + 1}/${HUB_PAGE_COUNT} · Not real money`,
    });

  return { embeds: [embed], components: rows };
}
