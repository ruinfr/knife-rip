import {
  ActionRowBuilder,
  type ButtonInteraction,
  EmbedBuilder,
  type Interaction,
  MessageFlags,
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
  buildCoinflipPvpChallengeEmbed,
  buildCoinflipPvpChallengeRows,
  COINFLIP_PVP_CHALLENGE_MS,
  handleCoinflipPvpAccept,
  handleCoinflipPvpDecline,
} from "./coinflip-pvp-flow";
import {
  handleDuelAccept,
  handleDuelDecline,
} from "./duel-flow";
import { handlePetMenuButton } from "./pet-menu";
import {
  handleFishBuyPole,
  handleFishEquipSelect,
  handleFishMenuCast,
  handleFishMinigamePick,
  parseFishingPoleKey,
} from "./fish-flow";
import {
  handleMineBuyPickaxe,
  handleMineEquipSelect,
  handleMineMenuDig,
  handleMineMinigamePick,
  parseMiningPickKey,
} from "./mine-flow";
import {
  handleWorkBuyJob,
  handleWorkEquipSelect,
  handleWorkMenuClockIn,
  handleWorkMinigamePick,
  parseWorkJobKey,
} from "./work-flow";
import {
  handleBusinessBackToMenu,
  handleBusinessEventComply,
  handleBusinessEventIgnore,
  handleBusinessEventRepair,
  handleBusinessMenuBuy,
  handleBusinessMenuCollect,
  handleBusinessMenuRefresh,
  handleBusinessSiteFocusSelect,
  handleBusinessTrackUpgrade,
  handleBusinessUpgradeTierSelect,
  type BusinessTrackLetter,
} from "./business-flow";
import { parseBusinessKey } from "./economy-tuning";
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
import {
  buildRoulettePickEmbed,
  buildRoulettePickRows,
  newRouletteToken,
  pruneRouletteSessions,
  ROULETTE_SESSION_TTL_MS,
  roulettePickLetterToChoice,
  rouletteSessions,
} from "./roulette-flow";
import { resolveEconomyPayRecipientId } from "./pay-recipient";
import { scheduleGambleOutcomeDeletion } from "./gamble-result-cleanup";
import { runHouseGame, type HouseGameKind } from "./games";
import {
  findEnvShopItem,
  parseEnvShopItemId,
} from "./economy-guild-config";
import {
  buildGambleDisclaimerPayload,
  buildGambleHubPayload,
  gambleHubPingContent,
} from "./hub-ui";
import { resolveHubGuild } from "./hub-guild";
import { economyLogEmbed, sendEconomyLog } from "./log";
import { formatCash, parsePositiveBigInt } from "./money";
import {
  buildRebirthEmbed,
  buildRebirthRows,
  executeRebirth,
  loadRebirthMenuCtx,
  purchaseRebirthShopUpgrade,
  REBIRTH_MENU_PAGE_COUNT,
  REBIRTH_PAGE_INDEX_CONFIRM,
  REBIRTH_PAGE_INDEX_SHOP,
  syncRebirthDisplayRoles,
} from "./rebirth-flow";
import type { RebirthShopState } from "./rebirth-mult";
import { getBotPrisma } from "../db-prisma";
import {
  applyCashDelta,
  getCash,
  getOrCreateEconomyUser,
  recordGambleDisclaimerAccepted,
  transferBetweenUsers,
} from "./wallet";

const gameCooldown = new Map<string, number>();

function gamblePingOpts(userId: string): {
  content: string;
  allowedMentions: { users: string[] };
} {
  return {
    content: gambleHubPingContent(userId),
    allowedMentions: { users: [userId] },
  };
}

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
      `${ecoM.gridiconslock} **These buttons belong to another user.** Use your own **\`.fish\`**, **\`.mine\`**, **\`.work\`**, **\`.business\`**, **\`.pets\`**, **\`.rebirth\`**, or **\`.gamble\`** menu.`,
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

  if (
    tok[0] === "cfpvp" &&
    tok[1] &&
    (tok[2] === "a" || tok[2] === "d")
  ) {
    const challengeId = tok[1]!;
    await interaction.deferUpdate();
    if (tok[2] === "a") {
      await handleCoinflipPvpAccept({
        interaction,
        challengeId,
        opponentId: uid,
      });
    } else {
      await handleCoinflipPvpDecline({
        interaction,
        challengeId,
        opponentId: uid,
      });
    }
    return;
  }

  if (
    tok[0] === "ecduel" &&
    tok[1] &&
    (tok[2] === "a" || tok[2] === "d")
  ) {
    const duelId = tok[1]!;
    await interaction.deferUpdate();
    if (tok[2] === "a") {
      await handleDuelAccept({
        interaction,
        duelId,
        opponentId: uid,
      });
    } else {
      await handleDuelDecline({
        interaction,
        duelId,
        opponentId: uid,
      });
    }
    return;
  }

  if (tok[0] === "pet") {
    const handled = await handlePetMenuButton({ uid, tok, interaction });
    if (handled) return;
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        ephemeral: true,
        content: "❌ That pet action is no longer valid.",
      });
    }
    return;
  }

  if (tok[0] === "rb") {
    if (tok[1] === "p" && tok[2] !== undefined) {
      const raw = parseInt(tok[2]!, 10);
      if (!Number.isFinite(raw)) return;
      const page = Math.max(
        0,
        Math.min(REBIRTH_MENU_PAGE_COUNT - 1, Math.floor(raw)),
      );
      await interaction.deferUpdate();
      const ctx = await loadRebirthMenuCtx(uid);
      await interaction.editReply({
        embeds: [buildRebirthEmbed(page, ctx)],
        components: buildRebirthRows(page, ctx),
      });
      return;
    }
    if (tok[1] === "yes") {
      await interaction.deferUpdate();
      try {
        const r = await executeRebirth(uid, Date.now());
        await syncRebirthDisplayRoles(interaction.client, uid, r.newCount);
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle("✅ Rebirth complete")
              .setDescription(
                `You are now **Rebirth ${r.newCount}** · **+${formatCash(r.gemsGained)}** gems (**${formatCash(r.gemsTotal)}** total).\n` +
                  `Wallet progress reset — permanent bonuses stay. Open **\`.rebirth\`** anytime for the full guide.`,
              ),
          ],
          components: [],
        });
      } catch (e) {
        const code = e instanceof Error ? e.message : "";
        const map: Record<string, string> = {
          POOR: "❌ Not enough **cash** for the next rebirth.",
          WEAK: "❌ Not enough **lifetime messages** yet.",
          COOLDOWN: "⏳ **Rebirth cooldown** — wait before trying again.",
          NOUSER: "❌ No economy profile — chat first.",
        };
        await interaction.followUp({
          ephemeral: true,
          content:
            map[code] ?? "❌ Could not rebirth — try **`.rebirth`** again.",
        });
        const ctx = await loadRebirthMenuCtx(uid);
        await interaction.editReply({
          embeds: [buildRebirthEmbed(REBIRTH_PAGE_INDEX_CONFIRM, ctx)],
          components: buildRebirthRows(REBIRTH_PAGE_INDEX_CONFIRM, ctx),
        });
      }
      return;
    }
    if (tok[1] === "sh" && tok[2]) {
      const track = tok[2]! as keyof RebirthShopState;
      if (!["coin", "daily", "rob", "petXp"].includes(track)) return;
      await interaction.deferUpdate();
      const res = await purchaseRebirthShopUpgrade(uid, track);
      const ctx = await loadRebirthMenuCtx(uid);
      const msg =
        res === "ok"
          ? "✅ Upgrade purchased."
          : res === "max"
            ? "Already maxed on that track."
            : res === "poor"
              ? "❌ Not enough gems."
              : "❌ Could not buy.";
      await interaction.followUp({ ephemeral: true, content: msg });
      await interaction.editReply({
        embeds: [buildRebirthEmbed(REBIRTH_PAGE_INDEX_SHOP, ctx)],
        components: buildRebirthRows(REBIRTH_PAGE_INDEX_SHOP, ctx),
      });
      return;
    }
  }

  if (tok[0] === "fish") {
    if (tok[1] === "c") {
      await handleFishMenuCast(interaction, uid);
      return;
    }
    if (tok[1] === "p" && tok[2] && tok[3] !== undefined) {
      const pick = parseInt(tok[3]!, 10);
      if (!Number.isFinite(pick)) return;
      await handleFishMinigamePick({
        interaction,
        uid,
        token: tok[2]!,
        pick,
      });
      return;
    }
    if (tok[1] === "b" && tok[2]) {
      const pk = parseFishingPoleKey(tok[2]!);
      if (pk) await handleFishBuyPole(interaction, uid, pk);
      return;
    }
  }

  if (tok[0] === "mine") {
    if (tok[1] === "d") {
      await handleMineMenuDig(interaction, uid);
      return;
    }
    if (tok[1] === "p" && tok[2] && tok[3] !== undefined) {
      const pickN = parseInt(tok[3]!, 10);
      if (!Number.isFinite(pickN)) return;
      await handleMineMinigamePick({
        interaction,
        uid,
        token: tok[2]!,
        pick: pickN,
      });
      return;
    }
    if (tok[1] === "b" && tok[2]) {
      const mk = parseMiningPickKey(tok[2]!);
      if (mk) await handleMineBuyPickaxe(interaction, uid, mk);
      return;
    }
  }

  if (tok[0] === "work") {
    if (tok[1] === "s") {
      await handleWorkMenuClockIn(interaction, uid);
      return;
    }
    if (tok[1] === "p" && tok[2] && tok[3] !== undefined) {
      const pickN = parseInt(tok[3]!, 10);
      if (!Number.isFinite(pickN)) return;
      await handleWorkMinigamePick({
        interaction,
        uid,
        token: tok[2]!,
        pick: pickN,
      });
      return;
    }
    if (tok[1] === "b" && tok[2]) {
      const jk = parseWorkJobKey(tok[2]!);
      if (jk) await handleWorkBuyJob(interaction, uid, jk);
      return;
    }
  }

  if (tok[0] === "biz") {
    if (tok[1] === "col") {
      await handleBusinessMenuCollect(interaction, uid);
      return;
    }
    if (tok[1] === "ref") {
      await handleBusinessMenuRefresh(interaction, uid);
      return;
    }
    if (tok[1] === "b" && tok[2]) {
      const bk = parseBusinessKey(tok[2]!);
      if (bk) {
        await handleBusinessMenuBuy(interaction, uid, bk);
        return;
      }
      await interaction.reply({
        ephemeral: true,
        content:
          "That purchase link is no longer valid — open **`.business`** again.",
      });
      return;
    }
    if (tok[1] === "back") {
      await handleBusinessBackToMenu(interaction, uid);
      return;
    }
    if (tok[1] === "ut" && tok[2] && /^[mase]$/.test(tok[2]!)) {
      await handleBusinessTrackUpgrade(
        interaction,
        uid,
        tok[2]! as BusinessTrackLetter,
      );
      return;
    }
    if (tok[1] === "ev" && tok[2] === "cmp" && tok[3]) {
      await handleBusinessEventComply(interaction, uid, tok[3]!);
      return;
    }
    if (tok[1] === "ev" && tok[2] === "rep" && tok[3]) {
      await handleBusinessEventRepair(interaction, uid, tok[3]!);
      return;
    }
    if (tok[1] === "ev" && tok[2] === "ign" && tok[3]) {
      await handleBusinessEventIgnore(interaction, uid, tok[3]!);
      return;
    }
  }

  if (
    tok[0] === "rl" &&
    tok[1] &&
    tok[2] &&
    /^[rbg]$/.test(tok[2]!)
  ) {
    await interaction.deferUpdate();
    pruneRouletteSessions();
    const token = tok[1]!;
    const letter = tok[2]!;
    const pick = roulettePickLetterToChoice(letter);
    if (!pick) return;
    const session = rouletteSessions.get(token);
    if (!session || session.userId !== uid) {
      await interaction.followUp({
        ephemeral: true,
        content:
          "Session expired or not yours — run **`.gamble`** and start again.",
      });
      return;
    }
    if (Date.now() - session.createdAt > ROULETTE_SESSION_TTL_MS) {
      rouletteSessions.delete(token);
      await interaction.followUp({
        ephemeral: true,
        content: "That roulette pick expired — start a new bet.",
      });
      return;
    }
    const cdKeyR = `${uid}:roulette`;
    const lastR = gameCooldown.get(cdKeyR) ?? 0;
    if (Date.now() - lastR < GAME_COOLDOWN_MS) {
      await interaction.followUp({
        ephemeral: true,
        content: "⏳ Game cooldown — try again in a few seconds.",
      });
      return;
    }
    rouletteSessions.delete(token);
    const mR = await interaction.guild?.members.fetch(uid).catch(() => null);
    try {
      const res = await runHouseGame({
        userId: uid,
        game: "roulette",
        bet: session.bet,
        roulettePick: pick,
        member: mR ?? null,
        client: interaction.client,
      });
      gameCooldown.set(cdKeyR, Date.now());
      const houseMsgR = await interaction.editReply({
        content: `${gambleHubPingContent(uid)}\n\n${res.summary}`,
        embeds: [],
        components: [],
        allowedMentions: { users: [uid] },
      });
      scheduleGambleOutcomeDeletion(houseMsgR);
    } catch (e) {
      const msgR =
        e instanceof Error && e.message === "INSUFFICIENT_FUNDS"
          ? "Not enough cash."
          : "Could not settle — try again.";
      await interaction.editReply({
        content: `${gambleHubPingContent(uid)}\n\n${msgR}`,
        embeds: [],
        components: [],
        allowedMentions: { users: [uid] },
      });
    }
    return;
  }

  if (tok[0] === "gd" && tok[1] === "open") {
    const ch = interaction.channel;
    if (!interaction.guild || !ch || ch.isDMBased()) {
      await interaction.reply({
        ephemeral: true,
        content: "Run **`.gamble`** in a **server text channel** to use Arivix Cash.",
      });
      return;
    }
    const disc = buildGambleDisclaimerPayload({
      userId: uid,
      guild: interaction.guild,
      originChannelId: ch.id,
    });
    await interaction.reply({
      ephemeral: true,
      embeds: disc.embeds,
      components: disc.components,
    });
    return;
  }

  if (tok[0] === "gk" && tok[1] === "ok") {
    const originChannelId =
      tok[2] && /^\d{17,20}$/.test(tok[2]) ? tok[2] : null;
    const fromDm = interaction.channel?.isDMBased() ?? false;
    const isEphemeral = interaction.message.flags.has(MessageFlags.Ephemeral);

    if (isEphemeral && originChannelId) {
      await interaction.deferUpdate();
      const ch = await interaction.client.channels
        .fetch(originChannelId)
        .catch(() => null);
      if (ch?.isTextBased() && !ch.isDMBased()) {
        const g = ch.guild;
        const payload = await buildGambleHubPayload({
          client: interaction.client,
          userId: uid,
          page: 0,
          guild: g,
        });
        try {
          await ch.send({
            ...gamblePingOpts(uid),
            embeds: payload.embeds,
            components: payload.components,
          });
          await recordGambleDisclaimerAccepted(uid);
          await interaction.editReply({
            content: "✅ **Arivix Cash** menu posted in this channel.",
            embeds: [],
            components: [],
          });
        } catch {
          await interaction.editReply({
            content:
              "Could not post the menu there. Check that Arivix can **send messages** in that channel, then run **`.gamble`** again.",
            embeds: [],
            components: [],
          });
        }
        return;
      }
      await interaction.editReply({
        content: "Could not resolve the channel — run **`.gamble`** again.",
        embeds: [],
        components: [],
      });
      return;
    }

    await interaction.deferUpdate();

    if (fromDm && originChannelId) {
      const ch = await interaction.client.channels
        .fetch(originChannelId)
        .catch(() => null);
      if (ch?.isTextBased() && !ch.isDMBased()) {
        const g = ch.guild;
        const payload = await buildGambleHubPayload({
          client: interaction.client,
          userId: uid,
          page: 0,
          guild: g,
        });
        try {
          await ch.send({
            ...gamblePingOpts(uid),
            embeds: payload.embeds,
            components: payload.components,
          });
          await recordGambleDisclaimerAccepted(uid);
          await interaction.message.edit({
            content: null,
            embeds: [
              new EmbedBuilder()
                .setColor(0x57f287)
                .setDescription(
                  `✅ **Menu sent** in <#${ch.id}> — continue there.`,
                ),
            ],
            components: [],
          });
        } catch {
          await interaction.message.edit({
            content: null,
            embeds: [
              new EmbedBuilder()
                .setColor(0xed4245)
                .setDescription(
                  "Could not post the menu in that channel. Check that Arivix can **send messages** there, then run **`.gamble`** again.",
                ),
            ],
            components: [],
          });
        }
        return;
      }
    }

    const payload = await buildGambleHubPayload({
      client: interaction.client,
      userId: uid,
      page: 0,
      guild,
    });
    await interaction.message.edit({
      ...gamblePingOpts(uid),
      embeds: payload.embeds,
      components: payload.components,
    });
    await recordGambleDisclaimerAccepted(uid);
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
      const bjMsg = await interaction.editReply({
        ...gamblePingOpts(uid),
        embeds: res.embeds,
        components: res.components,
      });
      if (res.components.length === 0) {
        scheduleGambleOutcomeDeletion(bjMsg);
      }
    } catch {
      await interaction.editReply({
        content: `${gambleHubPingContent(uid)}\n\n❌ Could not settle — balance may have changed.`,
        embeds: [],
        components: [],
        allowedMentions: { users: [uid] },
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
            content: `${gambleHubPingContent(uid)}\n\n❌ Invalid tile.`,
            embeds: [],
            components: [],
            allowedMentions: { users: [uid] },
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
          content: `${gambleHubPingContent(uid)}\n\n❌ Unknown action.`,
          embeds: [],
          components: [],
          allowedMentions: { users: [uid] },
        });
        return;
      }
      const mnMsg = await interaction.editReply({
        ...gamblePingOpts(uid),
        embeds: res.embeds,
        components: res.components,
      });
      if (res.roundFinished) {
        scheduleGambleOutcomeDeletion(mnMsg);
      }
    } catch {
      await interaction.editReply({
        content: `${gambleHubPingContent(uid)}\n\n❌ Could not settle — balance may have changed.`,
        embeds: [],
        components: [],
        allowedMentions: { users: [uid] },
      });
    }
    return;
  }

  if (tok[0] === "pg" && tok.length >= 3) {
    if (tok[2] === "trash") {
      await interaction.deferUpdate();
      await interaction.message.delete().catch(() => {});
      return;
    }
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
        ...gamblePingOpts(uid),
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
        gKey !== "mn" &&
        gKey !== "cfpv" &&
        gKey !== "rl"
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

      if (gKey === "rl") {
        const modalRl = new ModalBuilder()
          .setCustomId(`${ECON_INTERACTION_PREFIX}${uid}:m:rl`)
          .setTitle("Roulette")
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(input),
          );
        await interaction.showModal(modalRl);
        return;
      }
      if (gKey === "cfpv") {
        const modal = new ModalBuilder()
          .setCustomId(`${ECON_INTERACTION_PREFIX}${uid}:m:cfpvp`)
          // Modal title max 45 chars — custom emoji tokens exceed limit with "Coinflip PVP".
          .setTitle("Coinflip PVP");
        const target = new TextInputBuilder()
          .setCustomId("target")
          .setLabel("Opponent (username, @mention, or ID)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("e.g. @friend or username");
        const amountPv = new TextInputBuilder()
          .setCustomId("amount")
          .setLabel(`Bet (you have ${formatCash(cash)})`)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("e.g. 100");
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(target),
          new ActionRowBuilder<TextInputBuilder>().addComponents(amountPv),
        );
        await interaction.showModal(modal);
        return;
      }
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
                  `${ecoM.msgs} **Messages (lifetime, all servers):** **${u.lifetimeMessages.toLocaleString()}**\n` +
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
        .setLabel("Recipient (username, @mention, or ID)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder("e.g. cobra or @friend or 123…");
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

  if (tok[0] === "fish" && tok[1] === "sel" && tok[2] === "eq") {
    const choice = interaction.values[0];
    if (!choice) return;
    await handleFishEquipSelect(interaction, uid, choice);
    return;
  }

  if (tok[0] === "mine" && tok[1] === "sel" && tok[2] === "eq") {
    const choice = interaction.values[0];
    if (!choice) return;
    await handleMineEquipSelect(interaction, uid, choice);
    return;
  }

  if (tok[0] === "work" && tok[1] === "sel" && tok[2] === "eq") {
    const choice = interaction.values[0];
    if (!choice) return;
    await handleWorkEquipSelect(interaction, uid, choice);
    return;
  }

  if (tok[0] === "biz" && tok[1] === "sel" && tok[2] === "up") {
    const choice = interaction.values[0];
    if (!choice) return;
    await handleBusinessUpgradeTierSelect(interaction, uid, choice);
    return;
  }

  if (tok[0] === "biz" && tok[1] === "sel" && tok[2] === "focus") {
    const choice = interaction.values[0];
    if (!choice) return;
    await handleBusinessSiteFocusSelect(interaction, uid, choice);
    return;
  }

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
      try {
        await member.roles.add(envItem.roleId);
      } catch {
        try {
          await applyCashDelta({
            discordUserId: uid,
            delta: price,
            reason: "shop_refund",
            meta: {
              itemId: envItem.id,
              name: envItem.name,
              guildId: guild.id,
              cause: "role_assign_failed",
            },
          });
        } catch {
          /* refund failed — staff must fix balance manually */
        }
        await interaction.followUp({
          ephemeral: true,
          content:
            "❌ Could not assign the role — **your Arivix Cash was refunded**. Check bot role order / permissions.",
        });
        void sendEconomyLog(
          interaction.client,
          economyLogEmbed(
            `${ecoM.shop} Shop refund`,
            `<@${uid}> in **${guild.name}** — **${formatCash(price)}** back (**${envItem.name}**, role failed).`,
          ),
        );
        return;
      }
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
        e instanceof Error && e.message === "INSUFFICIENT_FUNDS"
          ? "❌ You no longer have enough cash for that."
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
    try {
      await member.roles.add(item.roleId);
    } catch {
      try {
        await applyCashDelta({
          discordUserId: uid,
          delta: price,
          reason: "shop_refund",
          meta: {
            itemId: item.id,
            name: item.name,
            cause: "role_assign_failed",
          },
        });
      } catch {
        /* refund failed — staff must fix balance manually */
      }
      await interaction.followUp({
        ephemeral: true,
        content:
          "❌ Could not assign the role — **your Arivix Cash was refunded**. Check bot role order / permissions.",
      });
      void sendEconomyLog(
        interaction.client,
        economyLogEmbed(
          `${ecoM.shop} Shop refund`,
          `<@${uid}> — **${formatCash(price)}** back (**${item.name}**, role failed).`,
        ),
      );
      return;
    }
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
      e instanceof Error && e.message === "INSUFFICIENT_FUNDS"
        ? "❌ You no longer have enough cash for that."
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
    await interaction.deferReply({ ephemeral: false });
    const amountRaw = interaction.fields.getTextInputValue("amount");
    const bet = parsePositiveBigInt(amountRaw);
    if (!bet) {
      await interaction.editReply({
        content: `${gambleHubPingContent(uid)}\n\n❌ Enter a positive whole amount.`,
        allowedMentions: { users: [uid] },
      });
      return;
    }
    const cash = await getCash(uid);
    if (bet > cash) {
      await interaction.editReply({
        content: `${gambleHubPingContent(uid)}\n\n❌ You only have **${formatCash(cash)}**.`,
        allowedMentions: { users: [uid] },
      });
      return;
    }
    const cdKey = `${uid}:${kind}`;
    const last = gameCooldown.get(cdKey) ?? 0;
    if (Date.now() - last < GAME_COOLDOWN_MS) {
      await interaction.editReply({
        content: `${gambleHubPingContent(uid)}\n\n⏳ Game cooldown — try again in a few seconds.`,
        allowedMentions: { users: [uid] },
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
        const bjStart = await interaction.editReply({
          ...gamblePingOpts(uid),
          embeds: payload.embeds,
          components: payload.components,
        });
        if (payload.components.length === 0) {
          scheduleGambleOutcomeDeletion(bjStart);
        }
      } else {
        const payload = await runMinesInitial({
          userId: uid,
          bet,
          member: m ?? null,
        });
        gameCooldown.set(cdKey, Date.now());
        await interaction.editReply({
          ...gamblePingOpts(uid),
          embeds: payload.embeds,
          components: payload.components,
        });
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "INSUFFICIENT_FUNDS"
          ? "❌ Not enough cash (balance changed?)."
          : "❌ Game error — try again.";
      await interaction.editReply({
        content: `${gambleHubPingContent(uid)}\n\n${msg}`,
        allowedMentions: { users: [uid] },
      });
    }
    return;
  }

  if (kind === "pay") {
    await interaction.deferReply({ ephemeral: true });
    const targetRaw = interaction.fields.getTextInputValue("target").trim();
    const amountRaw = interaction.fields.getTextInputValue("amount").trim();
    const resolved = await resolveEconomyPayRecipientId(
      interaction.guild,
      targetRaw,
    );
    if (!resolved.ok) {
      await interaction.editReply({ content: `❌ ${resolved.error}` });
      return;
    }
    const targetId = resolved.userId;
    const amount = parsePositiveBigInt(amountRaw);
    if (!amount) {
      await interaction.editReply({ content: "❌ Invalid **amount**." });
      return;
    }
    if (targetId === uid) {
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
        toId: targetId,
        amount,
      });
      await interaction.editReply({
        content:
          `✅ Sent **${formatCash(amount)}** to <@${targetId}>.\n` +
          `They received **${formatCash(recipientGot)}** (${ecoM.tax} tax **${formatCash(tax)}**).`,
      });
      void sendEconomyLog(
        interaction.client,
        economyLogEmbed(
          `${ecoM.pay} Transfer`,
          `<@${uid}> → <@${targetId}> **${formatCash(amount)}** (${ecoM.tax} tax **${formatCash(tax)}**).`,
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

  if (kind === "cfpvp") {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const channel = interaction.channel;
    if (!guild || !channel?.isTextBased() || channel.isDMBased()) {
      await interaction.editReply({
        content: "❌ Use **Coinflip PVP** from a **server** text channel.",
      });
      return;
    }
    const targetRaw = interaction.fields.getTextInputValue("target").trim();
    const amountRaw = interaction.fields.getTextInputValue("amount").trim();
    const resolved = await resolveEconomyPayRecipientId(guild, targetRaw);
    if (!resolved.ok) {
      await interaction.editReply({ content: `❌ ${resolved.error}` });
      return;
    }
    const targetId = resolved.userId;
    if (targetId === uid) {
      await interaction.editReply({
        content: "❌ You cannot challenge yourself.",
      });
      return;
    }
    const oppUser = await interaction.client.users
      .fetch(targetId)
      .catch(() => null);
    if (!oppUser?.id || oppUser.bot) {
      await interaction.editReply({
        content: "❌ Opponent must be a normal user (not a bot).",
      });
      return;
    }
    const betPv = parsePositiveBigInt(amountRaw);
    if (!betPv) {
      await interaction.editReply({
        content: "❌ Enter a positive whole **amount**.",
      });
      return;
    }
    const challengerCash = await getCash(uid);
    if (betPv > challengerCash) {
      await interaction.editReply({
        content: `❌ You only have **${formatCash(challengerCash)}**.`,
      });
      return;
    }
    const prismaPv = getBotPrisma();
    const expiresAtPv = new Date(Date.now() + COINFLIP_PVP_CHALLENGE_MS);
    const row = await prismaPv.economyCoinflipPvpChallenge.create({
      data: {
        guildId: guild.id,
        channelId: channel.id,
        challengerDiscordId: uid,
        opponentDiscordId: targetId,
        bet: betPv,
        status: "pending",
        expiresAt: expiresAtPv,
      },
    });
    const embedPv = buildCoinflipPvpChallengeEmbed({
      challengerId: uid,
      opponentId: targetId,
      bet: betPv,
      expiresAt: expiresAtPv,
    });
    const rowsPv = buildCoinflipPvpChallengeRows({
      opponentId: targetId,
      challengeId: row.id,
    });
    try {
      const msgPv = await channel.send({
        content: `<@${uid}> <@${targetId}>`,
        embeds: [embedPv],
        components: rowsPv,
        allowedMentions: { users: [uid, targetId] },
      });
      await prismaPv.economyCoinflipPvpChallenge.update({
        where: { id: row.id },
        data: { messageId: msgPv.id },
      });
      await interaction.editReply({
        content: `✅ Challenge posted in <#${channel.id}> — <@${targetId}> can **Accept** or **Decline**.`,
      });
    } catch {
      await prismaPv.economyCoinflipPvpChallenge
        .delete({ where: { id: row.id } })
        .catch(() => {});
      await interaction.editReply({
        content:
          "❌ Could not post the challenge. Check that Arivix can **Send Messages** in this channel.",
      });
    }
    return;
  }

  if (kind === "rl") {
    await interaction.deferReply({ ephemeral: false });
    const amountRawRl = interaction.fields.getTextInputValue("amount").trim();
    const betRl = parsePositiveBigInt(amountRawRl);
    if (!betRl) {
      await interaction.editReply({
        content: `${gambleHubPingContent(uid)}\n\n❌ Enter a positive whole amount.`,
        allowedMentions: { users: [uid] },
      });
      return;
    }
    const cashRl = await getCash(uid);
    if (betRl > cashRl) {
      await interaction.editReply({
        content: `${gambleHubPingContent(uid)}\n\n❌ You only have **${formatCash(cashRl)}**.`,
        allowedMentions: { users: [uid] },
      });
      return;
    }
    pruneRouletteSessions();
    const tokenRl = newRouletteToken();
    rouletteSessions.set(tokenRl, {
      userId: uid,
      bet: betRl,
      createdAt: Date.now(),
    });
    await interaction.editReply({
      ...gamblePingOpts(uid),
      embeds: [buildRoulettePickEmbed(betRl)],
      components: buildRoulettePickRows({ userId: uid, token: tokenRl }),
    });
    return;
  }

  const gameMap: Record<string, HouseGameKind> = {
    cf: "coinflip",
    dc: "dice",
    sl: "slots",
  };
  const game = gameMap[kind ?? ""];
  if (!game) return;

  await interaction.deferReply({ ephemeral: false });
  const amountRaw = interaction.fields.getTextInputValue("amount");
  const bet = parsePositiveBigInt(amountRaw);
  if (!bet) {
    await interaction.editReply({
      content: `${gambleHubPingContent(uid)}\n\n❌ Enter a positive whole amount.`,
      allowedMentions: { users: [uid] },
    });
    return;
  }
  const cash = await getCash(uid);
  if (bet > cash) {
    await interaction.editReply({
      content: `${gambleHubPingContent(uid)}\n\n❌ You only have **${formatCash(cash)}**.`,
      allowedMentions: { users: [uid] },
    });
    return;
  }

  const cdKey = `${uid}:${game}`;
  const last = gameCooldown.get(cdKey) ?? 0;
  if (Date.now() - last < GAME_COOLDOWN_MS) {
    await interaction.editReply({
      content: `${gambleHubPingContent(uid)}\n\n⏳ Game cooldown — try again in a few seconds.`,
      allowedMentions: { users: [uid] },
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
    const houseMsg = await interaction.editReply({
      content: `${gambleHubPingContent(uid)}\n\n${res.summary}`,
      allowedMentions: { users: [uid] },
    });
    scheduleGambleOutcomeDeletion(houseMsg);
  } catch (e) {
    const msg =
      e instanceof Error && e.message === "INSUFFICIENT_FUNDS"
        ? "❌ Not enough cash."
        : "❌ Game error — try again.";
    await interaction.editReply({
      content: `${gambleHubPingContent(uid)}\n\n${msg}`,
      allowedMentions: { users: [uid] },
    });
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