import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import type { Client } from "discord.js";
import { getRebirthDisplayRolePairs } from "../../config";
import { getBotPrisma } from "../db-prisma";
import { ECON_INTERACTION_PREFIX } from "./config";
import { ecoM } from "./custom-emojis";
import { resolveHubGuild } from "./hub-guild";
import { formatCash } from "./money";
import {
  gemsEarnedOnRebirth,
  parseRebirthShop,
  rebirthCashRequirement,
  rebirthMsgsRequirement,
  rebirthShopUpgradeGemCost,
  REBIRTH_COOLDOWN_MS,
  REBIRTH_SHOP_MAX,
  serializeRebirthShop,
  type RebirthShopState,
} from "./rebirth-mult";
import type { LedgerReason, Tx } from "./wallet";

export const REBIRTH_MENU_PAGE_COUNT = 5 as const;

/** 0-based index of the gem-shop panel (second-to-last). */
export const REBIRTH_PAGE_INDEX_SHOP = REBIRTH_MENU_PAGE_COUNT - 2;
/** 0-based index of the confirm panel (last). */
export const REBIRTH_PAGE_INDEX_CONFIRM = REBIRTH_MENU_PAGE_COUNT - 1;

/** 1-based page number shown to users for the gem shop. */
const REBIRTH_SHOP_PAGE_HUMAN = REBIRTH_MENU_PAGE_COUNT - 1;
/** 1-based page number for confirm. */
const REBIRTH_CONFIRM_PAGE_HUMAN = REBIRTH_MENU_PAGE_COUNT;

export type RebirthMenuCtx = {
  userId: string;
  rebirthCount: number;
  gems: bigint;
  cash: bigint;
  lifetimeMessages: number;
  lastRebirthAt: Date | null;
  shop: RebirthShopState;
};

export function rebirthPageButtonId(uid: string, page: number): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:rb:p:${page}`;
}

export function rebirthConfirmButtonId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:rb:yes`;
}

export function rebirthShopBuyId(
  uid: string,
  track: keyof RebirthShopState,
): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:rb:sh:${track}`;
}

export async function loadRebirthMenuCtx(userId: string): Promise<RebirthMenuCtx> {
  const prisma = getBotPrisma();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: userId },
  });
  if (!u) {
    return {
      userId,
      rebirthCount: 0,
      gems: 0n,
      cash: 0n,
      lifetimeMessages: 0,
      lastRebirthAt: null,
      shop: parseRebirthShop(null),
    };
  }
  return {
    userId,
    rebirthCount: u.rebirthCount,
    gems: u.rebirthGems,
    cash: u.cash,
    lifetimeMessages: u.lifetimeMessages,
    lastRebirthAt: u.lastRebirthAt,
    shop: parseRebirthShop(u.rebirthShop),
  };
}

export function buildRebirthEmbed(
  page: number,
  ctx: RebirthMenuCtx,
): EmbedBuilder {
  const p = Math.max(0, Math.min(REBIRTH_MENU_PAGE_COUNT - 1, page));
  const nextN = ctx.rebirthCount + 1;
  const needCash = rebirthCashRequirement(nextN);
  const needMsgs = rebirthMsgsRequirement(nextN);
  const canAfford =
    ctx.cash >= needCash && ctx.lifetimeMessages >= needMsgs;
  const cdLeft =
    ctx.lastRebirthAt &&
    Date.now() - ctx.lastRebirthAt.getTime() < REBIRTH_COOLDOWN_MS
      ? REBIRTH_COOLDOWN_MS - (Date.now() - ctx.lastRebirthAt.getTime())
      : 0;

  if (p === 0) {
    return new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(
        `${ecoM.cash} Rebirth — overview (${p + 1}/${REBIRTH_MENU_PAGE_COUNT})`,
      )
      .setDescription(
        `**Soft reset** your Knife Cash progress for **permanent** bonuses that **never** wipe on rebirth.\n\n` +
          `**Your rebirths:** **${ctx.rebirthCount}**\n` +
          `**Rebirth gems:** **${formatCash(ctx.gems)}** _(gem shop: page **${REBIRTH_SHOP_PAGE_HUMAN}**/${REBIRTH_MENU_PAGE_COUNT})_\n` +
          `**Wallet:** **${formatCash(ctx.cash)}** · **Lifetime msgs:** **${ctx.lifetimeMessages.toLocaleString()}**\n\n` +
          `**Next rebirth (#${nextN}) requires**\n` +
          `• **${formatCash(needCash)}** cash\n` +
          `• **${needMsgs.toLocaleString()}** lifetime messages\n` +
          `• **Both** must be met · **${Math.floor(REBIRTH_COOLDOWN_MS / 3600000)}h** cooldown between rebirths\n\n` +
          `${canAfford && cdLeft === 0 ? `✅ You meet the stats — read **page 2** (risks), then **page ${REBIRTH_CONFIRM_PAGE_HUMAN}** to confirm.` : !canAfford ? "🔒 Grind more cash or messages before you can rebirth." : `⏳ Cooldown — <t:${Math.floor((Date.now() + cdLeft) / 1000)}:R>`}\n\n` +
          `_Use **◀ ▶** to flip panels (**${REBIRTH_MENU_PAGE_COUNT}** pages)._`,
      );
  }

  if (p === 1) {
    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`⚠️ What resets (${p + 1}/${REBIRTH_MENU_PAGE_COUNT})`)
      .setDescription(
        `**On rebirth you lose**\n` +
          `• **All cash** → **0**\n` +
          `• **Bank** → **0** · tier **0**\n` +
          `• **All businesses** & business events\n` +
          `• **Work / fish / mine** gear → starter defaults\n` +
          `• **Gamble stats** (wins/losses/net/streak) → reset\n` +
          `• **Pet XP & happiness** → **0 / 100** _(pets kept)_\n` +
          `• Activity cooldowns cleared (work, crime, daily timer, etc.)\n\n` +
          `**You keep forever**\n` +
          `• **Rebirth count** & **gems** & **gem-shop upgrades**\n` +
          `• **Lifetime message count** _(used for requirements)_\n` +
          `• **Milestone payout progress** _(no double-dip on old tiers)_\n\n` +
          `_Last page (**${REBIRTH_CONFIRM_PAGE_HUMAN}**/${REBIRTH_MENU_PAGE_COUNT}) has the destructive confirm._`,
      );
  }

  if (p === 2) {
    const mult = ctx.rebirthCount * 10;
    return new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`✨ Permanent bonuses (${p + 1}/${REBIRTH_MENU_PAGE_COUNT})`)
      .setDescription(
        `**From rebirth tiers**\n` +
          `• **+${mult}%** cash from **most** earn sources (work, daily, gather, rob wins, milestones…)\n` +
          `• **+${(ctx.rebirthCount * 0.2).toFixed(1)}%** pet effectiveness on **.gamble** payouts (small)\n` +
          `• **Slightly** better coinflip / dice / slots luck\n` +
          `• **+${formatCash(BigInt(Math.min(40, ctx.rebirthCount)) * 50_000n)}** extra **bank cap** (flat)\n` +
          `• **Rebirth 3+** unlocks **phoenix** in \`.pet buy phoenix\`\n\n` +
          `**Optional hub roles** — set \`REBIRTH_DISPLAY_ROLES=\` \`1:roleId,5:roleId\` in the bot env for flex + tiny extra cash% in hub.\n\n` +
          `_Gem shop: page **${REBIRTH_SHOP_PAGE_HUMAN}**/${REBIRTH_MENU_PAGE_COUNT}._`,
      );
  }

  if (p === REBIRTH_PAGE_INDEX_SHOP) {
    const shop = ctx.shop;
    const line = (name: string, key: keyof RebirthShopState, emoji: string) => {
      const lv = shop[key];
      const cost =
        lv >= REBIRTH_SHOP_MAX
          ? "— maxed"
          : `${formatCash(rebirthShopUpgradeGemCost(key, lv))} gems`;
      return `${emoji} **${name}** — **${lv}/${REBIRTH_SHOP_MAX}** · next **${cost}**`;
    };

    return new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle(`💎 Gem shop (${p + 1}/${REBIRTH_MENU_PAGE_COUNT})`)
      .setDescription(
        `Spend **rebirth gems** (earned each rebirth) on permanent upgrades:\n\n` +
          `${line("Coin boost (+5%/lvl)", "coin", "📈")}\n` +
          `${line("Daily reward (+2%/lvl)", "daily", "📅")}\n` +
          `${line("Rob success (+0.2%/lvl)", "rob", "🥷")}\n` +
          `${line("Pet feed XP (+3%/lvl)", "petXp", "🐾")}\n\n` +
          `**Balance:** **${formatCash(ctx.gems)}** gems\n\n` +
          `_Use the **Buy** buttons on this page._`,
      );
  }

  const cdOk =
    !ctx.lastRebirthAt ||
    Date.now() - ctx.lastRebirthAt.getTime() >= REBIRTH_COOLDOWN_MS;
  const statOk =
    ctx.cash >= needCash && ctx.lifetimeMessages >= needMsgs && cdOk;

  return new EmbedBuilder()
    .setColor(0xc0392b)
    .setTitle(`☢️ Confirm rebirth (${p + 1}/${REBIRTH_MENU_PAGE_COUNT})`)
    .setDescription(
      `**This cannot be undone.** You will lose cash, bank, businesses, gear, and gamble stats.\n\n` +
        `**Requirement check:** ${statOk ? "✅ Ready" : "❌ Not ready"}\n` +
        `• Need **${formatCash(needCash)}** · you have **${formatCash(ctx.cash)}**\n` +
        `• Need **${needMsgs.toLocaleString()}** msgs · you have **${ctx.lifetimeMessages.toLocaleString()}**\n` +
        `• Cooldown: **${cdOk ? "OK" : "wait"}**\n\n` +
        `**You will earn** **${formatCash(gemsEarnedOnRebirth(ctx.rebirthCount))}** gems and become **Rebirth ${ctx.rebirthCount + 1}**.\n\n` +
        `_Press **REBIRTH NOW** only if you accept all losses._`,
    );
}

export function buildRebirthRows(
  page: number,
  ctx: RebirthMenuCtx,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const p = Math.max(0, Math.min(REBIRTH_MENU_PAGE_COUNT - 1, page));
  const uid = ctx.userId;
  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

  const prev = (p + REBIRTH_MENU_PAGE_COUNT - 1) % REBIRTH_MENU_PAGE_COUNT;
  const next = (p + 1) % REBIRTH_MENU_PAGE_COUNT;
  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(rebirthPageButtonId(uid, prev))
        .setLabel("◀ Prev")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(rebirthPageButtonId(uid, next))
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  if (p === REBIRTH_PAGE_INDEX_CONFIRM) {
    const nextN = ctx.rebirthCount + 1;
    const needCash = rebirthCashRequirement(nextN);
    const needMsgs = rebirthMsgsRequirement(nextN);
    const ok =
      ctx.cash >= needCash &&
      ctx.lifetimeMessages >= needMsgs &&
      (!ctx.lastRebirthAt ||
        Date.now() - ctx.lastRebirthAt.getTime() >= REBIRTH_COOLDOWN_MS);
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(rebirthConfirmButtonId(uid))
          .setLabel("⚠️ REBIRTH NOW (cannot undo)")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!ok),
      ),
    );
  }

  if (p === REBIRTH_PAGE_INDEX_SHOP) {
    const mkBuy = (track: keyof RebirthShopState, label: string) => {
      const lv = ctx.shop[track];
      const cost = rebirthShopUpgradeGemCost(track, lv);
      const can = lv < REBIRTH_SHOP_MAX && ctx.gems >= cost;
      return new ButtonBuilder()
        .setCustomId(rebirthShopBuyId(uid, track))
        .setLabel(label)
        .setStyle(ButtonStyle.Success)
        .setDisabled(!can);
    };
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        mkBuy("coin", "Buy +coin%"),
        mkBuy("daily", "Buy +daily%"),
      ),
    );
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        mkBuy("rob", "Buy +rob%"),
        mkBuy("petXp", "Buy +pet XP"),
      ),
    );
  }

  return rows;
}

export async function syncRebirthDisplayRoles(
  client: Client,
  userId: string,
  rebirthCount: number,
): Promise<void> {
  const guild = await resolveHubGuild(client);
  if (!guild) return;
  const pairs = getRebirthDisplayRolePairs();
  if (pairs.length === 0) return;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  for (const { tier, roleId } of pairs) {
    try {
      if (rebirthCount >= tier) {
        await member.roles.add(roleId);
      } else {
        await member.roles.remove(roleId).catch(() => {});
      }
    } catch {
      /* missing perms */
    }
  }
}

export async function runRebirthInTx(tx: Tx, userId: string, nowMs: number) {
  const row = await tx.economyUser.findUnique({
    where: { discordUserId: userId },
  });
  if (!row) throw new Error("NOUSER");
  const nextN = row.rebirthCount + 1;
  const needCash = rebirthCashRequirement(nextN);
  const needMsgs = rebirthMsgsRequirement(nextN);
  if (row.cash < needCash) throw new Error("POOR");
  if (row.lifetimeMessages < needMsgs) throw new Error("WEAK");
  if (
    row.lastRebirthAt &&
    nowMs - row.lastRebirthAt.getTime() < REBIRTH_COOLDOWN_MS
  ) {
    throw new Error("COOLDOWN");
  }

  const gemGain = gemsEarnedOnRebirth(row.rebirthCount);

  await tx.economyBusinessEvent.deleteMany({ where: { ownerId: userId } });
  await tx.economyBusinessSlot.deleteMany({ where: { ownerId: userId } });

  await tx.economyPet.updateMany({
    where: { ownerId: userId },
    data: { xp: 0, happiness: 100 },
  });

  await tx.economyUser.update({
    where: { discordUserId: userId },
    data: {
      cash: 0n,
      bankCash: 0n,
      bankTier: 0,
      lastBankInterestAt: null,
      gambleWins: 0,
      gambleLosses: 0,
      gambleNetProfit: 0n,
      gambleWinStreak: 0,
      gambleBestStreak: 0,
      fishingPoleEquipped: "twig",
      fishingPolesOwned: ["twig"],
      miningPickEquipped: "wood",
      miningPicksOwned: ["wood"],
      workJobEquipped: "intern",
      workJobsOwned: ["intern"],
      lastWorkAt: null,
      lastCrimeAt: null,
      lastBegAt: null,
      lastRobAt: null,
      lastMineAt: null,
      lastFishAt: null,
      lastDailyAt: null,
      businessEventLastRollAt: null,
      rebirthCount: { increment: 1 },
      rebirthGems: { increment: gemGain },
      lastRebirthAt: new Date(nowMs),
    },
  });

  const after = await tx.economyUser.findUnique({
    where: { discordUserId: userId },
  });
  if (!after) throw new Error("NOUSER");

  await tx.economyLedger.create({
    data: {
      discordUserId: userId,
      delta: 0n,
      balanceAfter: 0n,
      reason: "rebirth" satisfies LedgerReason,
      meta: {
        op: "rebirth",
        newTier: after.rebirthCount,
        gemsGained: gemGain.toString(),
      },
    },
  });

  return {
    newCount: after.rebirthCount,
    gemsGained: gemGain,
    gemsTotal: after.rebirthGems,
  };
}

export async function executeRebirth(userId: string, nowMs: number) {
  const prisma = getBotPrisma();
  return prisma.$transaction(async (tx) => {
    return runRebirthInTx(tx, userId, nowMs);
  });
}

export async function purchaseRebirthShopUpgrade(
  userId: string,
  track: keyof RebirthShopState,
): Promise<"ok" | "max" | "poor" | "bad"> {
  const prisma = getBotPrisma();
  return prisma.$transaction(async (tx) => {
    const row = await tx.economyUser.findUnique({
      where: { discordUserId: userId },
    });
    if (!row) return "bad";
    const shop = parseRebirthShop(row.rebirthShop);
    const lv = shop[track];
    if (lv >= REBIRTH_SHOP_MAX) return "max";
    const cost = rebirthShopUpgradeGemCost(track, lv);
    if (row.rebirthGems < cost) return "poor";
    shop[track] = lv + 1;
    await tx.economyUser.update({
      where: { discordUserId: userId },
      data: {
        rebirthGems: row.rebirthGems - cost,
        rebirthShop: serializeRebirthShop(shop),
      },
    });
    await tx.economyLedger.create({
      data: {
        discordUserId: userId,
        delta: 0n,
        balanceAfter: row.cash,
        reason: "rebirth" satisfies LedgerReason,
        meta: {
          op: "rebirth_shop",
          track,
          level: shop[track],
          cost: cost.toString(),
        },
      },
    });
    return "ok";
  });
}
