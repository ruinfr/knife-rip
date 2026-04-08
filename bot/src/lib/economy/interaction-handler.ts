import {
  ActionRowBuilder,
  type ButtonInteraction,
  EmbedBuilder,
  type Interaction,
  ModalBuilder,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  DROP_INTERACTION_PREFIX,
  ECON_INTERACTION_PREFIX,
  GAME_COOLDOWN_MS,
  HUB_PAGE_COUNT,
  PAY_COOLDOWN_MS,
} from "./config";
import {
  buildDropEmbed,
  dropActionRows,
  dropByToken,
  pickRandomMember,
} from "./drop-state";
import {
  handleBlackjackButton,
  runBlackjackInitial,
} from "./blackjack-flow";
import { ecoM } from "./custom-emojis";
import {
  handleMinesCash,
  handleMinesPick,
  runMinesInitial,
} from "./mines-flow";
import { runHouseGame, type HouseGameKind } from "./games";
import {
  findEnvShopItem,
  parseEnvShopItemId,
} from "./economy-guild-config";
import { buildGambleHubPayload } from "./hub-ui";
import { resolveHubGuild } from "./hub-guild";
import { economyLogEmbed, sendEconomyLog } from "./log";
import { formatCash, parsePositiveBigInt } from "./money";
import { getBotPrisma } from "../db-prisma";
import {
  applyCashDelta,
  getCash,
  getOrCreateEconomyUser,
  transferBetweenUsers,
} from "./wallet";

const gameCooldown = new Map<string, number>();

function parseKe(
  id: string,
): { uid: string; tok: string[] } | null {
  if (!id.startsWith(ECON_INTERACTION_PREFIX)) return null;
  const rest = id.slice(ECON_INTERACTION_PREFIX.length).split(":");
  const uid = rest[0];
  if (!uid || !/^\d{17,20}$/.test(uid)) return null;
  return { uid, tok: rest.slice(1) };
}

function parseKd(id: string): { token: string; action: string } | null {
  if (!id.startsWith(DROP_INTERACTION_PREFIX)) return null;
  const rest = id.slice(DROP_INTERACTION_PREFIX.length).split(":");
  if (rest.length < 2) return null;
  return { token: rest[0]!, action: rest[1]! };
}

async function denyNotYours(interaction: Interaction): Promise<void> {
  if (!interaction.isRepliable()) return;
  await interaction.reply({
    ephemeral: true,
    content:
      `${ecoM.gridiconslock} **This menu belongs to someone else.** Run **\`.gamble\`** to open your own.`,
  });
}

function hubPageFromTok(tok: string[]): number {
  if (tok[0] === "pg" && tok[1]) {
    const n = parseInt(tok[1], 10);
    if (Number.isFinite(n)) return Math.max(0, Math.min(HUB_PAGE_COUNT - 1, n));
  }
  return 0;
}

export async function handleEconomyInteraction(
  interaction: Interaction,
): Promise<void> {
  if (interaction.isButton()) {
    const id = interaction.customId;
    if (id.startsWith(DROP_INTERACTION_PREFIX)) {
      await handleDropButton(interaction);
      return;
    }
    if (!id.startsWith(ECON_INTERACTION_PREFIX)) return;
    await handleEconomyButton(interaction);
    return;
  }

  if (interaction.isStringSelectMenu()) {
    if (!interaction.customId.startsWith(ECON_INTERACTION_PREFIX)) return;
    await handleEconomySelect(interaction);
    return;
  }

  if (interaction.isModalSubmit()) {
    const id = interaction.customId;
    if (!id.startsWith(ECON_INTERACTION_PREFIX)) return;
    await handleEconomyModal(interaction);
  }
}

async function handleEconomyButton(interaction: ButtonInteraction): Promise<void> {
  const parsed = parseKe(interaction.customId);
  if (!parsed) return;
  if (parsed.uid !== interaction.user.id) {
    await denyNotYours(interaction);
    return;
  }

  const { uid, tok } = parsed;
  const guild = interaction.guild;

  if (tok[0] === "gk" && tok[1] === "ok") {
    await interaction.deferUpdate();
    const payload = await buildGambleHubPayload({
      client: interaction.client,
      userId: uid,
      page: 0,
      guild,
    });
    await interaction.message.edit({
      embeds: payload.embeds,
      components: payload.components,
    });
    return;
  }

  if (
    tok[0] === "bj" &&
    tok[1] &&
    tok[2] &&
    (tok[2] === "hit" || tok[2] === "stand")
  ) {
    await interaction.deferUpdate();
    const m = await interaction.guild?.members.fetch(uid).catch(() => null);
    try {
      const res = await handleBlackjackButton({
        userId: uid,
        token: tok[1]!,
        action: tok[2] as "hit" | "stand",
        member: m ?? null,
        client: interaction.client,
      });
      await interaction.editReply({
        embeds: res.embeds,
        components: res.components,
      });
    } catch {
      await interaction.editReply({
        content: "❌ Could not settle — balance may have changed.",
        embeds: [],
        components: [],
      });
    }
    return;
  }

  if (tok[0] === "mn" && tok[1]) {
    await interaction.deferUpdate();
    try {
      let res;
      if (tok[2] === "cash") {
        const m = await interaction.guild?.members
          .fetch(uid)
          .catch(() => null);
        res = await handleMinesCash({
          userId: uid,
          token: tok[1]!,
          member: m ?? null,
          client: interaction.client,
        });
      } else if (tok[2] === "p" && tok[3] !== undefined) {
        const idx = parseInt(tok[3]!, 10);
        if (!Number.isFinite(idx)) {
          await interaction.editReply({
            content: "❌ Invalid tile.",
            embeds: [],
            components: [],
          });
          return;
        }
        res = await handleMinesPick({
          userId: uid,
          token: tok[1]!,
          idx,
          guild: interaction.guild,
          client: interaction.client,
        });
      } else {
        await interaction.editReply({
          content: "❌ Unknown action.",
          embeds: [],
          components: [],
        });
        return;
      }
      await interaction.editReply({
        embeds: res.embeds,
        components: res.components,
      });
    } catch {
      await interaction.editReply({
        content: "❌ Could not settle — balance may have changed.",
        embeds: [],
        components: [],
      });
    }
    return;
  }

  if (tok[0] === "pg" && tok.length >= 3) {
    const cur = hubPageFromTok(tok);
    if (tok[2] === "prev" || tok[2] === "next") {
      const delta = tok[2] === "next" ? 1 : -1;
      const next = (cur + delta + HUB_PAGE_COUNT) % HUB_PAGE_COUNT;
      await interaction.deferUpdate();
      const payload = await buildGambleHubPayload({
        client: interaction.client,
        userId: uid,
        page: next,
        guild,
      });
      await interaction.message.edit({
        embeds: payload.embeds,
        components: payload.components,
      });
      return;
    }

    if (tok[2] === "g" && tok[3]) {
      const gKey = tok[3];
      if (
        gKey !== "cf" &&
        gKey !== "dc" &&
        gKey !== "sl" &&
        gKey !== "bj" &&
        gKey !== "mn"
      ) {
        return;
      }
      const cash = await getCash(uid);
      const input = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel(`Bet (you have ${formatCash(cash)})`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder("e.g. 100");

      if (gKey === "bj") {
        const modal = new ModalBuilder()
          .setCustomId(`${ECON_INTERACTION_PREFIX}${uid}:m:bj`)
          .setTitle(`${ecoM.blackjack} Blackjack`)
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(input),
          );
        await interaction.showModal(modal);
        return;
      }
      if (gKey === "mn") {
        const modal = new ModalBuilder()
          .setCustomId(`${ECON_INTERACTION_PREFIX}${uid}:m:mn`)
          .setTitle(`${ecoM.mines} Mines`)
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(input),
          );
        await interaction.showModal(modal);
        return;
      }

      const map: Record<string, HouseGameKind> = {
        cf: "coinflip",
        dc: "dice",
        sl: "slots",
      };
      const kind = map[gKey]!;
      const modal = new ModalBuilder()
        .setCustomId(`${ECON_INTERACTION_PREFIX}${uid}:m:${gKey}`)
        .setTitle(
          kind === "coinflip"
            ? `${ecoM.coinflip} Coinflip`
            : kind === "dice"
              ? `${ecoM.dice} Dice`
              : `${ecoM.slots} Slots`,
        );
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(input),
      );
      await interaction.showModal(modal);
      return;
    }

    if (tok[2] === "st" && tok[3]) {
      await interaction.deferReply({ ephemeral: true });
      const prisma = getBotPrisma();
      if (tok[3] === "me") {
        const u = await getOrCreateEconomyUser(uid);
        const rank =
          1 +
          (await prisma.economyUser.count({
            where: { cash: { gt: u.cash } },
          }));
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle(`${ecoM.stats} Your stats`)
              .setDescription(
                `${ecoM.wallet} **Cash:** **${formatCash(u.cash)}**\n` +
                  `${ecoM.msgs} **Messages (tracked):** **${u.lifetimeMessages.toLocaleString()}**\n` +
                  `${ecoM.rankInStatsMenu} **Rank:** **#${rank}** by cash\n` +
                  `${ecoM.winLossInStatsMenu} **W / L:** **${u.gambleWins}** / **${u.gambleLosses}**\n` +
                  `${ecoM.netInStatsMenu} **Net (games):** **${formatCash(u.gambleNetProfit)}**\n` +
                  `${ecoM.streakInStatsMenu} **Win streak:** **${u.gambleWinStreak}** (best **${u.gambleBestStreak}**)`,
              ),
          ],
        });
        return;
      }
      if (tok[3] === "topc") {
        const top = await prisma.economyUser.findMany({
          orderBy: { cash: "desc" },
          take: 8,
          select: { discordUserId: true, cash: true },
        });
        const lines = await Promise.all(
          top.map(async (r, i) => {
            const user = await interaction.client.users
              .fetch(r.discordUserId)
              .catch(() => null);
            const tag = user?.username ?? r.discordUserId;
            return `**${i + 1}.** ${tag} — **${formatCash(r.cash)}**`;
          }),
        );
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf0b232)
              .setTitle(`${ecoM.toplb} Richest`)
              .setDescription(
                lines.length > 0
                  ? lines.join("\n")
                  : "No wallets yet — start chatting!",
              ),
          ],
        });
        return;
      }
      if (tok[3] === "topg") {
        const top = await prisma.economyUser.findMany({
          orderBy: { gambleNetProfit: "desc" },
          take: 8,
          select: { discordUserId: true, gambleNetProfit: true },
        });
        const lines = await Promise.all(
          top.map(async (r, i) => {
            const user = await interaction.client.users
              .fetch(r.discordUserId)
              .catch(() => null);
            const tag = user?.username ?? r.discordUserId;
            return `**${i + 1}.** ${tag} — **${formatCash(r.gambleNetProfit)}**`;
          }),
        );
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle(`${ecoM.topgambler} Top gamblers (net profit)`)
              .setDescription(
                lines.length > 0
                  ? lines.join("\n")
                  : "No games played yet.",
              ),
          ],
        });
        return;
      }
      return;
    }

    if (tok[2] === "pay" && tok[3] === "open") {
      const modal = new ModalBuilder()
        .setCustomId(`${ECON_INTERACTION_PREFIX}${uid}:m:pay`)
        .setTitle(`${ecoM.pay} Send cash`);
      const target = new TextInputBuilder()
        .setCustomId("target")
        .setLabel("Recipient user ID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder("Discord user snowflake");
      const amount = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Amount")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(target),
        new ActionRowBuilder<TextInputBuilder>().addComponents(amount),
      );
      await interaction.showModal(modal);
    }
  }
}

async function handleEconomySelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const parsed = parseKe(interaction.customId);
  if (!parsed) return;
  if (parsed.uid !== interaction.user.id) {
    await denyNotYours(interaction);
    return;
  }
  const { uid, tok } = parsed;
  if (tok[0] !== "pg" || tok[2] !== "shop" || tok[3] !== "sel") return;

  const itemId = interaction.values[0];
  if (!itemId) return;

  await interaction.deferUpdate();

  const guild = interaction.guild;
  if (!guild) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ Use the shop from a server.",
    });
    return;
  }

  const prisma = getBotPrisma();

  if (itemId.startsWith("envshop:")) {
    const ref = parseEnvShopItemId(itemId);
    if (!ref || ref.guildId !== guild.id) {
      await interaction.followUp({
        ephemeral: true,
        content: "❌ That item is not sold in this server.",
      });
      return;
    }
    const envItem = findEnvShopItem(guild.id, itemId);
    if (!envItem) {
      await interaction.followUp({
        ephemeral: true,
        content: "❌ That item is no longer available.",
      });
      return;
    }
    const price = envItem.price;
    const row = await getOrCreateEconomyUser(uid);
    if (row.cash < price) {
      await interaction.followUp({
        ephemeral: true,
        content: `❌ You need **${formatCash(price)}** — you have **${formatCash(row.cash)}**.`,
      });
      return;
    }
    const member = await guild.members.fetch(uid).catch(() => null);
    if (!member) {
      await interaction.followUp({
        ephemeral: true,
        content: "❌ You need to be in this server to buy that.",
      });
      return;
    }
    try {
      await prisma.$transaction(async (tx) => {
        const u = await tx.economyUser.findUnique({
          where: { discordUserId: uid },
        });
        if (!u || u.cash < price) throw new Error("INSUFFICIENT_FUNDS");
        const newCash = u.cash - price;
        await tx.economyUser.update({
          where: { discordUserId: uid },
          data: { cash: newCash },
        });
        await tx.economyLedger.create({
          data: {
            discordUserId: uid,
            delta: -price,
            balanceAfter: newCash,
            reason: "shop_buy",
            meta: { itemId: envItem.id, name: envItem.name, guildId: guild.id },
          },
        });
      });
      await member.roles.add(envItem.roleId).catch(() => {
        throw new Error("ROLE");
      });
      await interaction.followUp({
        ephemeral: true,
        content: `✅ Bought **${envItem.emoji} ${envItem.name}** for **${formatCash(price)}**!`,
      });
      void sendEconomyLog(
        interaction.client,
        economyLogEmbed(
          `${ecoM.shop} Shop purchase`,
          `<@${uid}> in **${guild.name}** bought **${envItem.name}** for **${formatCash(price)}**.`,
        ),
      );
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "ROLE"
          ? "❌ Could not assign the role — check bot role order / permissions."
          : "❌ Purchase failed — try again or ask staff.";
      await interaction.followUp({ ephemeral: true, content: msg });
    }
    return;
  }

  const item = await prisma.economyShopItem.findFirst({
    where: { id: itemId, active: true },
  });
  if (!item) {
    await interaction.followUp({
      ephemeral: true,
      content: "❌ That item is no longer available.",
    });
    return;
  }

  const price = BigInt(item.price);
  const row = await getOrCreateEconomyUser(uid);
  if (row.cash < price) {
    await interaction.followUp({
      ephemeral: true,
      content: `❌ You need **${formatCash(price)}** — you have **${formatCash(row.cash)}**.`,
    });
    return;
  }

  const hub = await resolveHubGuild(interaction.client);
  if (!hub) {
    await interaction.followUp({
      ephemeral: true,
      content:
        "❌ This catalog needs the hub server configured on the bot to deliver roles.",
    });
    return;
  }

  const member = await hub.members.fetch(uid).catch(() => null);
  if (!member) {
    await interaction.followUp({
      ephemeral: true,
      content:
        `❌ Join the **${hub.name}** server so the bot can give you **${item.name}**.`,
    });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const u = await tx.economyUser.findUnique({ where: { discordUserId: uid } });
      if (!u || u.cash < price) throw new Error("INSUFFICIENT_FUNDS");
      const newCash = u.cash - price;
      await tx.economyUser.update({
        where: { discordUserId: uid },
        data: { cash: newCash },
      });
      await tx.economyLedger.create({
        data: {
          discordUserId: uid,
          delta: -price,
          balanceAfter: newCash,
          reason: "shop_buy",
          meta: { itemId: item.id, name: item.name },
        },
      });
    });
    await member.roles.add(item.roleId).catch(() => {
      throw new Error("ROLE");
    });
    await interaction.followUp({
      ephemeral: true,
      content: `✅ Bought **${item.emoji} ${item.name}** for **${formatCash(price)}**!`,
    });
    void sendEconomyLog(
      interaction.client,
      economyLogEmbed(
        `${ecoM.shop} Shop purchase`,
        `<@${uid}> bought **${item.name}** for **${formatCash(price)}**.`,
      ),
    );
  } catch (e) {
    const msg =
      e instanceof Error && e.message === "ROLE"
        ? "❌ Could not assign the role — check bot role order / permissions."
        : "❌ Purchase failed — try again or ask staff.";
    await interaction.followUp({ ephemeral: true, content: msg });
  }
}

async function handleEconomyModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const parsed = parseKe(interaction.customId);
  if (!parsed) return;
  if (parsed.uid !== interaction.user.id) {
    await denyNotYours(interaction);
    return;
  }
  const { uid, tok } = parsed;
  if (tok[0] !== "m") return;

  const kind = tok[1];
  if (kind === "bj" || kind === "mn") {
    await interaction.deferReply({ ephemeral: true });
    const amountRaw = interaction.fields.getTextInputValue("amount");
    const bet = parsePositiveBigInt(amountRaw);
    if (!bet) {
      await interaction.editReply({
        content: "❌ Enter a positive whole amount.",
      });
      return;
    }
    const cash = await getCash(uid);
    if (bet > cash) {
      await interaction.editReply({
        content: `❌ You only have **${formatCash(cash)}**.`,
      });
      return;
    }
    const cdKey = `${uid}:${kind}`;
    const last = gameCooldown.get(cdKey) ?? 0;
    if (Date.now() - last < GAME_COOLDOWN_MS) {
      await interaction.editReply({
        content: "⏳ Game cooldown — try again in a few seconds.",
      });
      return;
    }
    const m = await interaction.guild?.members.fetch(uid).catch(() => null);
    try {
      if (kind === "bj") {
        const payload = await runBlackjackInitial({
          userId: uid,
          bet,
          member: m ?? null,
          client: interaction.client,
        });
        gameCooldown.set(cdKey, Date.now());
        await interaction.editReply({
          embeds: payload.embeds,
          components: payload.components,
        });
      } else {
        const payload = await runMinesInitial({
          userId: uid,
          bet,
          member: m ?? null,
        });
        gameCooldown.set(cdKey, Date.now());
        await interaction.editReply({
          embeds: payload.embeds,
          components: payload.components,
        });
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "INSUFFICIENT_FUNDS"
          ? "❌ Not enough cash (balance changed?)."
          : "❌ Game error — try again.";
      await interaction.editReply({ content: msg });
    }
    return;
  }

  if (kind === "pay") {
    await interaction.deferReply({ ephemeral: true });
    const targetRaw = interaction.fields.getTextInputValue("target").trim();
    const amountRaw = interaction.fields.getTextInputValue("amount").trim();
    if (!/^\d{17,20}$/.test(targetRaw)) {
      await interaction.editReply({
        content: "❌ **Recipient** must be a numeric Discord user ID.",
      });
      return;
    }
    const amount = parsePositiveBigInt(amountRaw);
    if (!amount) {
      await interaction.editReply({ content: "❌ Invalid **amount**." });
      return;
    }
    if (targetRaw === uid) {
      await interaction.editReply({ content: "❌ You cannot pay yourself." });
      return;
    }
    const payer = await getOrCreateEconomyUser(uid);
    if (
      payer.lastPayAt &&
      Date.now() - payer.lastPayAt.getTime() < PAY_COOLDOWN_MS
    ) {
      await interaction.editReply({
        content: "⏳ Slow down — wait a bit between transfers.",
      });
      return;
    }
    try {
      const { recipientGot, tax } = await transferBetweenUsers({
        fromId: uid,
        toId: targetRaw,
        amount,
      });
      await interaction.editReply({
        content:
          `✅ Sent **${formatCash(amount)}** to <@${targetRaw}>.\n` +
          `They received **${formatCash(recipientGot)}** (${ecoM.tax} tax **${formatCash(tax)}**).`,
      });
      void sendEconomyLog(
        interaction.client,
        economyLogEmbed(
          `${ecoM.pay} Transfer`,
          `<@${uid}> → <@${targetRaw}> **${formatCash(amount)}** (${ecoM.tax} tax **${formatCash(tax)}**).`,
        ),
      );
    } catch (e) {
      const m =
        e instanceof Error && e.message === "INSUFFICIENT_FUNDS"
          ? "❌ Insufficient balance."
          : "❌ Transfer failed.";
      await interaction.editReply({ content: m });
    }
    return;
  }

  const gameMap: Record<string, HouseGameKind> = {
    cf: "coinflip",
    dc: "dice",
    sl: "slots",
  };
  const game = gameMap[kind ?? ""];
  if (!game) return;

  await interaction.deferReply({ ephemeral: true });
  const amountRaw = interaction.fields.getTextInputValue("amount");
  const bet = parsePositiveBigInt(amountRaw);
  if (!bet) {
    await interaction.editReply({ content: "❌ Enter a positive whole amount." });
    return;
  }
  const cash = await getCash(uid);
  if (bet > cash) {
    await interaction.editReply({
      content: `❌ You only have **${formatCash(cash)}**.`,
    });
    return;
  }

  const cdKey = `${uid}:${game}`;
  const last = gameCooldown.get(cdKey) ?? 0;
  if (Date.now() - last < GAME_COOLDOWN_MS) {
    await interaction.editReply({
      content: "⏳ Game cooldown — try again in a few seconds.",
    });
    return;
  }

  const m = await interaction.guild?.members.fetch(uid).catch(() => null);
  try {
    const res = await runHouseGame({
      userId: uid,
      game,
      bet,
      member: m ?? null,
      client: interaction.client,
    });
    gameCooldown.set(cdKey, Date.now());
    await interaction.editReply({ content: res.summary });
  } catch (e) {
    const msg =
      e instanceof Error && e.message === "INSUFFICIENT_FUNDS"
        ? "❌ Not enough cash."
        : "❌ Game error — try again.";
    await interaction.editReply({ content: msg });
  }
}

async function handleDropButton(interaction: ButtonInteraction): Promise<void> {
  const p = parseKd(interaction.customId);
  if (!p) return;
  const session = dropByToken.get(p.token);
  if (!session) {
    await interaction.reply({
      ephemeral: true,
      content: "⏰ This drop has expired or was already finished.",
    });
    return;
  }
  if (interaction.user.id !== session.ownerId) {
    await interaction.reply({
      ephemeral: true,
      content: `${ecoM.gridiconslock} Only the staff member who started this drop can use these buttons.`,
    });
    return;
  }

  const guild = interaction.guild;
  if (!guild || guild.id !== session.guildId) {
    await interaction.reply({
      ephemeral: true,
      content: "❌ Wrong server.",
    });
    return;
  }

  if (p.action === "cancel") {
    dropByToken.delete(p.token);
    await interaction.deferUpdate();
    await interaction.message.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`${ecoM.Cancel} Lucky drop cancelled`)
          .setDescription("No cash was awarded."),
      ],
      components: [],
    });
    return;
  }

  if (p.action === "reroll") {
    const exclude = new Set([session.ownerId]);
    const next = pickRandomMember(guild, exclude);
    if (!next) {
      await interaction.reply({
        ephemeral: true,
        content: "❌ No eligible members to pick.",
      });
      return;
    }
    session.selectedUserId = next;
    await interaction.deferUpdate();
    await interaction.message.edit({
      embeds: [buildDropEmbed(session, guild)],
      components: dropActionRows(p.token),
    });
    return;
  }

  if (p.action === "confirm") {
    await interaction.deferUpdate();
    try {
      await applyCashDelta({
        discordUserId: session.selectedUserId,
        delta: session.amount,
        reason: "luckydrop",
        actorUserId: session.ownerId,
        meta: { guildId: session.guildId },
      });
      dropByToken.delete(p.token);
      await interaction.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(`${ecoM.Confirm} Lucky drop complete`)
            .setDescription(
              `<@${session.selectedUserId}> received **${formatCash(session.amount)}** cash!`,
            ),
        ],
        components: [],
      });
      void sendEconomyLog(
        interaction.client,
        economyLogEmbed(
          `${ecoM.luckydrop} Lucky drop`,
          `<@${session.ownerId}> awarded **${formatCash(session.amount)}** → <@${session.selectedUserId}>.`,
        ),
      );
    } catch {
      await interaction.message.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle(`${ecoM.Cancel} Drop failed`)
            .setDescription("Could not credit — try again."),
        ],
        components: [],
      });
    }
  }
}