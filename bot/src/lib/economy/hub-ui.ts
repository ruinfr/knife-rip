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
  MILESTONE_HELP_LINES,
} from "./config";
import { ecoBtn, ecoM, economyHubPageTitle } from "./custom-emojis";
import { getEnvShopItemsForGuild } from "./economy-guild-config";
import { formatCash } from "./money";
import { getCash } from "./wallet";

const HUB_COLOR = 0x57f287;

function btnId(uid: string, ...parts: string[]): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:${parts.join(":")}`;
}

/** User mention on hub / game messages so busy channels can spot your menu. */
export function gambleHubPingContent(userId: string): string {
  return `<@${userId}>`;
}

/**
 * Public `.gamble` reply in a server: mentions the user, button opens an **ephemeral** disclaimer.
 */
export function buildGambleDisclaimerPromptPayload(userId: string): {
  content: string;
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
} {
  const row =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(btnId(userId, "gd", "open"))
        .setLabel("Read disclaimer (private)")
        .setStyle(ButtonStyle.Primary)
        .setEmoji(ecoBtn.tablerinfosquarefilled),
    );
  return {
    content:
      `<@${userId}> · Tap **Read disclaimer** — only **you** see the next step; then your menu posts **here**.`,
    embeds: [],
    components: [row],
  };
}

/** Shown first from `.gamble`; checkmark replaces this message with the full hub. */
export function buildGambleDisclaimerPayload(params: {
  userId: string;
  guild: Guild | null;
  /**
   * Guild text/thread id: included on **I understand** so the hub can be posted there
   * (e.g. after an ephemeral disclaimer).
   */
  originChannelId?: string | null;
}): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
} {
  const { userId, guild, originChannelId } = params;
  const embed = new EmbedBuilder()
    .setColor(0xf0b232)
    .setTitle(`${ecoM.games} Arivix Cash`)
    .setDescription(
      "_Quick read — a few short sections below._\n\n" +
        `${ecoM.tablerinfosquarefilled} When you’re ready, press **I understand** at the bottom.`,
    )
    .addFields(
      {
        name: "What this is",
        value:
          "Arivix Cash is **not real money**.\n" +
          "It’s pretend balance for fun — **no cash-out**, no real-world value.",
        inline: false,
      },
      {
        name: "Before you bet",
        value:
          "• You **can lose** cash on games — only bet what you’re fine losing.\n\n" +
          "• **Not** real-world gambling.\n\n" +
          "• Bets you start from this menu post **in this channel** — others can see wins and losses.",
        inline: false,
      },
      {
        name: "Bonuses",
        value:
          "• **.daily** — **50** cash, once every **24 hours**.\n\n" +
          "• Server boosters and **Arivix Pro** (and owners) get **+20%** on eligible payouts.",
        inline: false,
      },
      {
        name: "Message milestones",
        value:
          "_Every normal message you send in a **server** counts (while Arivix is there). DMs do not._\n\n" +
          MILESTONE_HELP_LINES.map((line) => `• ${line}`).join("\n\n"),
        inline: false,
      },
    )
    .setFooter({
      text: `${guild?.name ? `${guild.name} · ` : ""}The button only works for you`,
    });

  const okParts =
    originChannelId && /^\d{17,20}$/.test(originChannelId)
      ? (["gk", "ok", originChannelId] as const)
      : (["gk", "ok"] as const);

  const row =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(btnId(userId, ...okParts))
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
    new ButtonBuilder()
      .setCustomId(btnId(userId, "pg", String(p), "trash"))
      .setLabel("\u200b")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️"),
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
        // Placeholders are plain text—`<:name:id>` does not render as an emoji here.
        .setPlaceholder("🛒 Choose an item to buy…")
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
      `${ecoM.coinflip} **Coinflip** · ${ecoM.dice} **Dice** · ${ecoM.slots} **Slots** · ${ecoM.roulette} **Roulette** — instant\n` +
      `${ecoM.blackjack} **Blackjack** · ${ecoM.mines} **Mines** — interactive (buttons)\n` +
      `${ecoM.coinflippvp} **Coinflip PVP** — challenge someone (+ stake); they **Accept** or **Decline** (no house rake).\n\n` +
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
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "g", "cfpv"))
          .setLabel("Coinflip PVP")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(ecoBtn.coinflippvp),
        new ButtonBuilder()
          .setCustomId(btnId(userId, "pg", String(p), "g", "rl"))
          .setLabel("Roulette")
          .setStyle(ButtonStyle.Primary)
          .setEmoji(ecoBtn.roulette),
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
      `${ecoM.stats} **Stats** — your global Arivix Cash profile.\n\n` +
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
      `${ecoM.pay} **Pay** — send cash to another user` +
      (guild
        ? ` (**username**, @mention, or ID in **${guild.name}**).\n\n`
        : ` (**numeric ID** or @mention — no username search in DMs).\n\n`) +
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
