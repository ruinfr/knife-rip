import type { EconomyBusinessEvent, EconomyBusinessSlot } from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type GuildMember,
  type MessageComponentInteraction,
} from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { applyBankInterestIfAny } from "./bank-touch";
import {
  businessSlotRowToAccrualInput,
  computeBusinessAccrued,
  computeBusinessHourlyRate,
} from "./business-accrual";
import {
  blockingEventForUi,
  eventRepairCostBigint,
  formatActiveEventBanner,
  prepareBusinessEconomyPass,
  processExpiredBusinessEvents,
  resolveFireIgnore,
  resolveFireRepair,
  resolveInspectionComply,
  rushIncomeMultBpsForKey,
  clearExpiredSlotDebuffs,
} from "./business-events";
import { ECON_INTERACTION_PREFIX } from "./config";
import { rebirthBoostEarn } from "./rebirth-income";
import { businessKeyEmoji, ecoM } from "./custom-emojis";
import {
  BUSINESS_BASE_PRICES,
  BUSINESS_BAND,
  BUSINESS_DISPLAY_NAME,
  BUSINESS_KEYS,
  BUSINESS_MAX_TIER,
  BUSINESS_PURCHASE_TAX_PCT,
  BUSINESS_RATE_PER_HOUR,
  BUSINESS_TRACK_MAX_LEVEL,
  BUSINESS_TRACK_UPGRADE_PRICE_BASE_PERMILLE,
  BUSINESS_TRACK_UPGRADE_PRICE_PER_LEVEL_PERMILLE,
  parseBusinessKey,
  type BusinessKey,
} from "./economy-tuning";
import { formatCash } from "./money";
import {
  creditTreasuryInTx,
  type LedgerReason,
} from "./wallet";

export type BusinessMenuContext = {
  userId: string;
  slots: EconomyBusinessSlot[];
  events: EconomyBusinessEvent[];
  cash: bigint;
  nowMs: number;
  autoGain: bigint;
};

export type BusinessTrackLetter = "m" | "a" | "s" | "e";

const FOCUS_TTL_MS = 180_000;
const businessSiteFocus = new Map<
  string,
  { key: BusinessKey; expiresAt: number }
>();

export function peekBusinessFocus(uid: string): BusinessKey | null {
  const v = businessSiteFocus.get(uid);
  if (!v || Date.now() > v.expiresAt) {
    businessSiteFocus.delete(uid);
    return null;
  }
  return v.key;
}

function setBusinessFocus(uid: string, key: BusinessKey): void {
  businessSiteFocus.set(uid, { key, expiresAt: Date.now() + FOCUS_TTL_MS });
}

export function clearBusinessFocus(uid: string): void {
  businessSiteFocus.delete(uid);
}

function taxOn(price: bigint): bigint {
  return (price * BigInt(BUSINESS_PURCHASE_TAX_PCT) + 99n) / 100n;
}

function ownedBusinessKeysFromSlots(
  slots: { businessKey: string }[],
): Set<BusinessKey> {
  const set = new Set<BusinessKey>();
  for (const s of slots) {
    const k = parseBusinessKey(s.businessKey);
    if (k) set.add(k);
  }
  return set;
}

export function nextBuyableBusiness(owned: Set<BusinessKey>): BusinessKey | null {
  for (const k of BUSINESS_KEYS) {
    if (!owned.has(k)) return k;
  }
  return null;
}

function buyTotalCost(
  key: BusinessKey,
  tier: number,
): { price: bigint; tax: bigint; total: bigint } {
  const price = BUSINESS_BASE_PRICES[key] * BigInt(tier);
  const tax = taxOn(price);
  return { price, tax, total: price + tax };
}

function upgradeTotalCost(
  key: BusinessKey,
  fromTier: number,
): { price: bigint; tax: bigint; total: bigint } {
  const price = BUSINESS_BASE_PRICES[key] * BigInt(fromTier);
  const tax = taxOn(price);
  return { price, tax, total: price + tax };
}

function trackUpgradePrice(key: BusinessKey, currentLevel: number): bigint {
  const base = BUSINESS_BASE_PRICES[key];
  const perm =
    BUSINESS_TRACK_UPGRADE_PRICE_BASE_PERMILLE +
    BUSINESS_TRACK_UPGRADE_PRICE_PER_LEVEL_PERMILLE * currentLevel;
  return (base * BigInt(perm)) / 1000n;
}

const TRACK_FIELD: Record<
  BusinessTrackLetter,
  keyof Pick<
    EconomyBusinessSlot,
    "marketingLevel" | "automationLevel" | "staffLevel" | "equipmentLevel"
  >
> = {
  m: "marketingLevel",
  a: "automationLevel",
  s: "staffLevel",
  e: "equipmentLevel",
};

const TRACK_LABEL: Record<BusinessTrackLetter, string> = {
  m: "Marketing (+income %)",
  a: "Automation (idle cap + auto-bank)",
  s: "Staff (inspection fines ↓)",
  e: "Equipment (+base rate)",
};

export function businessCollectButtonId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:biz:col`;
}

export function businessRefreshButtonId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:biz:ref`;
}

export function businessBuyButtonId(uid: string, key: BusinessKey): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:biz:b:${key}`;
}

export function businessUpgradeTierSelectId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:biz:sel:up`;
}

export function businessSiteFocusSelectId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:biz:sel:focus`;
}

export function businessBackToMenuId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:biz:back`;
}

export function businessTrackUpgradeButtonId(
  uid: string,
  track: BusinessTrackLetter,
): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:biz:ut:${track}`;
}

export function businessEventComplyId(uid: string, eventId: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:biz:ev:cmp:${eventId}`;
}

export function businessEventRepairId(uid: string, eventId: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:biz:ev:rep:${eventId}`;
}

export function businessEventIgnoreId(uid: string, eventId: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:biz:ev:ign:${eventId}`;
}

const BAND_LABEL: Record<string, string> = {
  starter: "**Starter** (empire slots 1–3)",
  mid: "**Mid** (slots 4–6)",
  high: "**High** (slots 7–10)",
};

export async function loadBusinessMenuContext(
  userId: string,
): Promise<BusinessMenuContext> {
  const nowMs = Date.now();
  const { autoGain } = await prepareBusinessEconomyPass(userId, nowMs);
  const prisma = getBotPrisma();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: userId },
  });
  const slots = await prisma.economyBusinessSlot.findMany({
    where: { ownerId: userId },
  });
  const events = await prisma.economyBusinessEvent.findMany({
    where: {
      ownerId: userId,
      resolved: false,
      expiresAt: { gt: new Date(nowMs) },
    },
  });
  return {
    userId,
    slots,
    events,
    cash: u?.cash ?? 0n,
    nowMs,
    autoGain,
  };
}

export async function buildBusinessMenuEmbed(
  ctx: BusinessMenuContext,
): Promise<EmbedBuilder> {
  const { userId, slots, events, cash, nowMs, autoGain } = ctx;
  const owned = ownedBusinessKeysFromSlots(slots);
  const next = nextBuyableBusiness(owned);
  const slotByKey = new Map<BusinessKey, EconomyBusinessSlot>();
  for (const s of slots) {
    const k = parseBusinessKey(s.businessKey);
    if (k) slotByKey.set(k, s);
  }

  let pending = 0n;
  for (const [k, row] of slotByKey) {
    const rushBps = rushIncomeMultBpsForKey(events, row.businessKey, nowMs);
    pending += computeBusinessAccrued(
      k,
      businessSlotRowToAccrualInput(row),
      nowMs,
      { incomeMultBps: rushBps },
    );
  }

  const nextLine =
    next === null
      ? "_You own every franchise in this track._"
      : (() => {
          const { total } = buyTotalCost(next, 1);
          return `**Next to buy:** ${businessKeyEmoji(next)} **${BUSINESS_DISPLAY_NAME[next]}** — **${formatCash(total)}** total (incl. tax).`;
        })();

  const autoLine =
    autoGain > 0n
      ? `⚡ **Automation** auto-banked **${formatCash(autoGain)}** on this refresh.\n`
      : "";

  const catalogByBand = (band: "starter" | "mid" | "high") =>
    BUSINESS_KEYS.filter((k) => BUSINESS_BAND[k] === band)
      .map((k) => {
        const em = businessKeyEmoji(k);
        const name = BUSINESS_DISPLAY_NAME[k];
        const rate = BUSINESS_RATE_PER_HOUR[k];
        const slot = slotByKey.get(k);
        const { total } = buyTotalCost(k, 1);
        if (slot) {
          const hr = computeBusinessHourlyRate(k, businessSlotRowToAccrualInput(slot));
          const tr = `M${slot.marketingLevel} A${slot.automationLevel} S${slot.staffLevel} E${slot.equipmentLevel}`;
          return `${em} **${name}** · tier **${slot.tier}** · **${formatCash(hr)}**/h · \`${tr}\` · collected <t:${Math.floor(slot.lastCollectedAt.getTime() / 1000)}:R>`;
        }
        return `${em} **${name}** · **${formatCash(rate)}**/h @ tier 1 (before tracks) · first buy **${formatCash(total)}**`;
      })
      .join("\n");

  const empireLines =
    owned.size === 0
      ? "_No sites yet — buy your first stand below._"
      : BUSINESS_KEYS.filter((k) => owned.has(k))
          .map((k) => {
            const s = slotByKey.get(k)!;
            const rushBps = rushIncomeMultBpsForKey(events, s.businessKey, nowMs);
            const acc = computeBusinessAccrued(
              k,
              businessSlotRowToAccrualInput(s),
              nowMs,
              { incomeMultBps: rushBps },
            );
            const hr = computeBusinessHourlyRate(k, businessSlotRowToAccrualInput(s));
            const autoOn = s.automationLevel >= 1 ? " · ⚡auto" : "";
            return `${businessKeyEmoji(k)} **${BUSINESS_DISPLAY_NAME[k]}** · **${formatCash(hr)}**/h${autoOn} · **+${formatCash(acc)}** idle`;
          })
          .join("\n");

  const banner = formatActiveEventBanner(events, nowMs);

  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`${ecoM.cash} Arivix Cash — businesses`)
    .setDescription(
      banner +
        `**Quick guide**\n` +
        `• **📈 Marketing** — +% income · **🛠️ Equipment** — stronger hourly rate · **⚡ Automation** — higher idle cap + **auto-bank** when you open this menu · **🧑‍💼 Staff** — softer health-inspection fines.\n` +
        `• **Collect all** banks every site (Rush Hour stacks).\n` +
        `• Buy new franchises **in order** (green). **Raise tier** and **specialize** from the dropdowns.\n` +
        `• **Random events** roll when you refresh (cooldown) — check often for bonuses and to clear inspections / fires.\n\n` +
        autoLine +
        `${ecoM.wallet} **${formatCash(cash)}**\n` +
        `**Pending (estimate):** **${formatCash(pending)}**\n` +
        `${nextLine}\n\n` +
        `**Your sites**\n${empireLines}\n\n` +
        `${BAND_LABEL.starter}\n${catalogByBand("starter")}\n\n` +
        `${BAND_LABEL.mid}\n${catalogByBand("mid")}\n\n` +
        `${BAND_LABEL.high}\n${catalogByBand("high")}\n\n` +
        `_Franchise **tier** still multiplies the base table rate; tracks modify the effective **$/h** shown above._`,
    )
    .setFooter({
      text: "Only you can use these controls.",
    });
}

export function buildBusinessTrackSubrows(params: {
  userId: string;
  slot: EconomyBusinessSlot;
  key: BusinessKey;
}): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const { userId, slot, key } = params;
  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(businessBackToMenuId(userId))
        .setLabel("Back")
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  const mkBtn = (t: BusinessTrackLetter, emoji: string, label: string, lv: number) =>
    new ButtonBuilder()
      .setCustomId(businessTrackUpgradeButtonId(userId, t))
      .setLabel(`${emoji} ${label} (${lv}/${BUSINESS_TRACK_MAX_LEVEL})`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(lv >= BUSINESS_TRACK_MAX_LEVEL);

  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      mkBtn("m", "📈", "Marketing", slot.marketingLevel),
      mkBtn("a", "⚡", "Automation", slot.automationLevel),
    ),
  );
  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      mkBtn("s", "🧑‍💼", "Staff", slot.staffLevel),
      mkBtn("e", "🛠️", "Equipment", slot.equipmentLevel),
    ),
  );

  return rows;
}

export function buildBusinessMenuRows(
  ctx: BusinessMenuContext,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const { userId, slots, events, nowMs } = ctx;
  const focus = peekBusinessFocus(userId);
  if (focus) {
    const slot = slots.find((s) => parseBusinessKey(s.businessKey) === focus);
    if (slot) {
      return buildBusinessTrackSubrows({ userId, slot, key: focus });
    }
    clearBusinessFocus(userId);
  }

  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
  const owned = ownedBusinessKeysFromSlots(slots);

  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(businessCollectButtonId(userId))
        .setLabel("Collect all")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📥"),
      new ButtonBuilder()
        .setCustomId(businessRefreshButtonId(userId))
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔄"),
    ),
  );

  const next = nextBuyableBusiness(owned);
  if (next) {
    const { total } = buyTotalCost(next, 1);
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(businessBuyButtonId(userId, next))
          .setLabel(`Buy ${BUSINESS_DISPLAY_NAME[next]} (${formatCash(total)})`)
          .setStyle(ButtonStyle.Success),
      ),
    );
  }

  const tierOpts: StringSelectMenuOptionBuilder[] = [];
  for (const k of BUSINESS_KEYS) {
    if (!owned.has(k)) continue;
    const slot = slots.find((s) => parseBusinessKey(s.businessKey) === k);
    if (!slot || slot.tier >= BUSINESS_MAX_TIER) continue;
    const { total } = upgradeTotalCost(k, slot.tier);
    tierOpts.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${BUSINESS_DISPLAY_NAME[k]} → tier ${slot.tier + 1}`)
        .setDescription(`${formatCash(total)} total`)
        .setValue(k),
    );
  }
  if (tierOpts.length > 0) {
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(businessUpgradeTierSelectId(userId))
          .setPlaceholder("Raise franchise tier…")
          .addOptions(tierOpts),
      ),
    );
  }

  const block = blockingEventForUi(events, nowMs);
  if (block?.kind === "inspection") {
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(businessEventComplyId(userId, block.id))
          .setLabel("Comply (pass inspection)")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🚨"),
      ),
    );
  } else if (block?.kind === "fire") {
    const cost = eventRepairCostBigint(block);
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(businessEventRepairId(userId, block.id))
          .setLabel(`Repair (${formatCash(cost)})`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🛠️"),
        new ButtonBuilder()
          .setCustomId(businessEventIgnoreId(userId, block.id))
          .setLabel("Ignore (income penalty)")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔥"),
      ),
    );
  } else {
    const siteOpts: StringSelectMenuOptionBuilder[] = [];
    for (const k of BUSINESS_KEYS) {
      if (!owned.has(k)) continue;
      siteOpts.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(BUSINESS_DISPLAY_NAME[k])
          .setValue(k),
      );
    }
    if (siteOpts.length > 0) {
      rows.push(
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(businessSiteFocusSelectId(userId))
            .setPlaceholder("Specialize a site (tracks)…")
            .addOptions(siteOpts),
        ),
      );
    }
  }

  return rows;
}

export async function restoreBusinessMenuMessage(
  interaction: MessageComponentInteraction,
  userId: string,
): Promise<void> {
  const ctx = await loadBusinessMenuContext(userId);
  const embed = await buildBusinessMenuEmbed(ctx);
  const rows = buildBusinessMenuRows(ctx);
  await interaction.editReply({
    content: `<@${userId}>`,
    embeds: [embed],
    components: rows,
    allowedMentions: { users: [userId] },
  });
}

function isGuildTextBusinessInteraction(
  interaction: MessageComponentInteraction,
): boolean {
  const ch = interaction.channel;
  return Boolean(
    interaction.guild &&
      ch &&
      ch.isTextBased() &&
      !ch.isDMBased(),
  );
}

export async function runBusinessCollect(
  uid: string,
  nowMs: number,
  member: GuildMember | null = null,
) {
  const prisma = getBotPrisma();
  return prisma.$transaction(async (tx) => {
    await applyBankInterestIfAny(tx, uid, nowMs);
    await clearExpiredSlotDebuffs(tx, uid, nowMs);
    await processExpiredBusinessEvents(tx, uid, nowMs);

    const active = await tx.economyBusinessEvent.findMany({
      where: {
        ownerId: uid,
        resolved: false,
        expiresAt: { gt: new Date(nowMs) },
      },
    });

    const slots = await tx.economyBusinessSlot.findMany({
      where: { ownerId: uid },
    });
    let gain = 0n;
    const lines: string[] = [];
    const nowD = new Date(nowMs);
    for (const s of slots) {
      const k = parseBusinessKey(s.businessKey);
      if (!k) continue;
      const rushBps = rushIncomeMultBpsForKey(active, s.businessKey, nowMs);
      const acc = computeBusinessAccrued(
        k,
        businessSlotRowToAccrualInput(s),
        nowMs,
        { incomeMultBps: rushBps },
      );
      if (acc > 0n) {
        gain += acc;
        lines.push(
          `${businessKeyEmoji(k)} **${BUSINESS_DISPLAY_NAME[k]}** +**${formatCash(acc)}**`,
        );
        await tx.economyBusinessSlot.update({
          where: { id: s.id },
          data: { lastCollectedAt: nowD },
        });
      }
    }
    if (gain <= 0n) return { total: 0n, lines: [] as string[] };
    const u = await tx.economyUser.findUnique({
      where: { discordUserId: uid },
    });
    if (!u) throw new Error("NOUSER");
    const paid = rebirthBoostEarn(u, member, gain);
    const cashAfter = u.cash + paid;
    await tx.economyUser.update({
      where: { discordUserId: uid },
      data: { cash: cashAfter },
    });
    await tx.economyLedger.create({
      data: {
        discordUserId: uid,
        delta: paid,
        balanceAfter: cashAfter,
        reason: "business" satisfies LedgerReason,
        meta: { op: "collect" },
      },
    });
    return { total: paid, lines, cashAfter };
  });
}

export async function runBusinessBuy(uid: string, nowMs: number, key: BusinessKey) {
  const prisma = getBotPrisma();
  return prisma.$transaction(async (tx) => {
    await applyBankInterestIfAny(tx, uid, nowMs);
    const slots = await tx.economyBusinessSlot.findMany({
      where: { ownerId: uid },
      select: { businessKey: true },
    });
    const owned = ownedBusinessKeysFromSlots(slots);
    const mustBe = nextBuyableBusiness(owned);
    if (mustBe !== key) throw new Error("ORDER");

    const existing = await tx.economyBusinessSlot.findUnique({
      where: {
        ownerId_businessKey: { ownerId: uid, businessKey: key },
      },
    });
    if (existing) throw new Error("OWNED");

    const tier = 1;
    const price = BUSINESS_BASE_PRICES[key] * BigInt(tier);
    const tax = taxOn(price);
    const total = price + tax;

    const u = await tx.economyUser.findUnique({
      where: { discordUserId: uid },
    });
    if (!u || u.cash < total) throw new Error("POOR");

    const cashAfter = u.cash - total;
    await tx.economyUser.update({
      where: { discordUserId: uid },
      data: { cash: cashAfter },
    });
    await tx.economyLedger.create({
      data: {
        discordUserId: uid,
        delta: -total,
        balanceAfter: cashAfter,
        reason: "business" satisfies LedgerReason,
        meta: { op: "buy", key, price: price.toString(), tax: tax.toString() },
      },
    });
    if (tax > 0n) {
      await creditTreasuryInTx(tx, {
        delta: tax,
        reason: "treasury_fee",
        meta: { kind: "business_tax", userId: uid, key },
        actorUserId: uid,
      });
    }
    await tx.economyBusinessSlot.create({
      data: {
        ownerId: uid,
        businessKey: key,
        tier,
        lastCollectedAt: new Date(nowMs),
      },
    });
    return { cashAfter, price, tax };
  });
}

export async function runBusinessUpgradeTier(
  uid: string,
  nowMs: number,
  key: BusinessKey,
) {
  const prisma = getBotPrisma();
  return prisma.$transaction(async (tx) => {
    await applyBankInterestIfAny(tx, uid, nowMs);
    const slot = await tx.economyBusinessSlot.findUnique({
      where: {
        ownerId_businessKey: { ownerId: uid, businessKey: key },
      },
    });
    if (!slot) throw new Error("MISSING");
    if (slot.tier >= BUSINESS_MAX_TIER) throw new Error("MAX");

    const price = BUSINESS_BASE_PRICES[key] * BigInt(slot.tier);
    const tax = taxOn(price);
    const total = price + tax;

    const u = await tx.economyUser.findUnique({
      where: { discordUserId: uid },
    });
    if (!u || u.cash < total) throw new Error("POOR");

    const cashAfter = u.cash - total;
    const newTier = slot.tier + 1;

    await tx.economyUser.update({
      where: { discordUserId: uid },
      data: { cash: cashAfter },
    });
    await tx.economyLedger.create({
      data: {
        discordUserId: uid,
        delta: -total,
        balanceAfter: cashAfter,
        reason: "business" satisfies LedgerReason,
        meta: {
          op: "upgrade_tier",
          key,
          fromTier: slot.tier,
          toTier: newTier,
          price: price.toString(),
          tax: tax.toString(),
        },
      },
    });
    if (tax > 0n) {
      await creditTreasuryInTx(tx, {
        delta: tax,
        reason: "treasury_fee",
        meta: { kind: "business_upgrade_tax", userId: uid, key },
        actorUserId: uid,
      });
    }
    await tx.economyBusinessSlot.update({
      where: { id: slot.id },
      data: { tier: newTier },
    });
    return { cashAfter, price, tax, newTier };
  });
}

export async function runTrackUpgrade(
  uid: string,
  nowMs: number,
  key: BusinessKey,
  track: BusinessTrackLetter,
) {
  const prisma = getBotPrisma();
  return prisma.$transaction(async (tx) => {
    await applyBankInterestIfAny(tx, uid, nowMs);
    const slot = await tx.economyBusinessSlot.findUnique({
      where: {
        ownerId_businessKey: { ownerId: uid, businessKey: key },
      },
    });
    if (!slot) throw new Error("MISSING");
    const field = TRACK_FIELD[track];
    const cur = slot[field];
    if (cur >= BUSINESS_TRACK_MAX_LEVEL) throw new Error("TRACK_MAX");

    const price = trackUpgradePrice(key, cur);
    const tax = taxOn(price);
    const total = price + tax;

    const u = await tx.economyUser.findUnique({
      where: { discordUserId: uid },
    });
    if (!u || u.cash < total) throw new Error("POOR");

    const cashAfter = u.cash - total;
    await tx.economyUser.update({
      where: { discordUserId: uid },
      data: { cash: cashAfter },
    });
    await tx.economyLedger.create({
      data: {
        discordUserId: uid,
        delta: -total,
        balanceAfter: cashAfter,
        reason: "business" satisfies LedgerReason,
        meta: {
          op: "upgrade_track",
          key,
          track,
          from: cur,
          to: cur + 1,
          price: price.toString(),
          tax: tax.toString(),
        },
      },
    });
    if (tax > 0n) {
      await creditTreasuryInTx(tx, {
        delta: tax,
        reason: "treasury_fee",
        meta: { kind: "business_track_tax", userId: uid, key, track },
        actorUserId: uid,
      });
    }
    await tx.economyBusinessSlot.update({
      where: { id: slot.id },
      data: { [field]: cur + 1 },
    });
    return { cashAfter, price, tax, newLevel: cur + 1, track };
  });
}

export async function handleBusinessMenuCollect(
  interaction: MessageComponentInteraction,
  uid: string,
): Promise<void> {
  if (!isGuildTextBusinessInteraction(interaction)) {
    await interaction.reply({
      ephemeral: true,
      content: "Use **`.business`** in a **server text channel**.",
    });
    return;
  }
  await interaction.deferUpdate();
  const now = Date.now();
  try {
    const member =
      interaction.guild &&
      (await interaction.guild.members.fetch(uid).catch(() => null));
    const { total, lines } = await runBusinessCollect(uid, now, member);
    if (total > 0n) {
      await interaction.followUp({
        ephemeral: true,
        content: `Collected **${formatCash(total)}**.\n${lines.join("\n")}`,
      });
    } else {
      await interaction.followUp({
        ephemeral: true,
        content: "Nothing accrued yet — check back later.",
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOUSER") {
      await interaction.followUp({
        ephemeral: true,
        content: "No wallet found — chat a bit first.",
      });
    } else {
      await interaction.followUp({
        ephemeral: true,
        content: "Could not collect — try again.",
      });
    }
  }
  await restoreBusinessMenuMessage(interaction, uid);
}

export async function handleBusinessMenuRefresh(
  interaction: MessageComponentInteraction,
  uid: string,
): Promise<void> {
  if (!isGuildTextBusinessInteraction(interaction)) {
    await interaction.reply({
      ephemeral: true,
      content: "Use **`.business`** in a **server text channel**.",
    });
    return;
  }
  await interaction.deferUpdate();
  await restoreBusinessMenuMessage(interaction, uid);
}

export async function handleBusinessMenuBuy(
  interaction: MessageComponentInteraction,
  uid: string,
  key: BusinessKey,
): Promise<void> {
  if (!isGuildTextBusinessInteraction(interaction)) {
    await interaction.reply({
      ephemeral: true,
      content: "Use **`.business`** in a **server text channel**.",
    });
    return;
  }
  await interaction.deferUpdate();
  const now = Date.now();
  try {
    const res = await runBusinessBuy(uid, now, key);
    await interaction.followUp({
      ephemeral: true,
      content:
        `Bought **${BUSINESS_DISPLAY_NAME[key]}** for **${formatCash(res.price)}** + **${formatCash(res.tax)}** tax. ` +
        `**${formatCash(BUSINESS_RATE_PER_HOUR[key])}**/h base @ tier 1 · Balance: **${formatCash(res.cashAfter)}**.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "ORDER") {
      await interaction.followUp({
        ephemeral: true,
        content:
          "Buy franchises **in order** — use the green button for the next one.",
      });
    } else if (msg === "OWNED") {
      await interaction.followUp({
        ephemeral: true,
        content: "You already own that site.",
      });
    } else if (msg === "POOR") {
      await interaction.followUp({
        ephemeral: true,
        content: "Not enough cash for that purchase (including tax).",
      });
    } else {
      await interaction.followUp({
        ephemeral: true,
        content: "Purchase failed — try again.",
      });
    }
  }
  await restoreBusinessMenuMessage(interaction, uid);
}

export async function handleBusinessUpgradeTierSelect(
  interaction: MessageComponentInteraction,
  uid: string,
  choice: string,
): Promise<void> {
  if (!isGuildTextBusinessInteraction(interaction)) {
    await interaction.reply({
      ephemeral: true,
      content: "Use **`.business`** in a **server text channel**.",
    });
    return;
  }
  const key = parseBusinessKey(choice);
  if (!key) {
    await interaction.reply({
      ephemeral: true,
      content: "Invalid tier upgrade choice.",
    });
    return;
  }
  await interaction.deferUpdate();
  const now = Date.now();
  try {
    const res = await runBusinessUpgradeTier(uid, now, key);
    const effTier = Math.min(res.newTier, BUSINESS_MAX_TIER);
    const perH =
      BUSINESS_RATE_PER_HOUR[key] * BigInt(effTier);
    await interaction.followUp({
      ephemeral: true,
      content:
        `**${BUSINESS_DISPLAY_NAME[key]}** is now **tier ${res.newTier}** (base **${formatCash(perH)}**/h before tracks). ` +
        `Paid **${formatCash(res.price)}** + **${formatCash(res.tax)}** tax · Balance **${formatCash(res.cashAfter)}**.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "MISSING") {
      await interaction.followUp({
        ephemeral: true,
        content: "You don't own that franchise.",
      });
    } else if (msg === "MAX") {
      await interaction.followUp({
        ephemeral: true,
        content: `That site is already max tier (**${BUSINESS_MAX_TIER}**).`,
      });
    } else if (msg === "POOR") {
      await interaction.followUp({
        ephemeral: true,
        content: "Not enough cash for that upgrade (including tax).",
      });
    } else {
      await interaction.followUp({
        ephemeral: true,
        content: "Upgrade failed — try again.",
      });
    }
  }
  await restoreBusinessMenuMessage(interaction, uid);
}

export async function handleBusinessSiteFocusSelect(
  interaction: MessageComponentInteraction,
  uid: string,
  choice: string,
): Promise<void> {
  if (!isGuildTextBusinessInteraction(interaction)) {
    await interaction.reply({
      ephemeral: true,
      content: "Use **`.business`** in a **server text channel**.",
    });
    return;
  }
  const key = parseBusinessKey(choice);
  if (!key) {
    await interaction.reply({
      ephemeral: true,
      content: "Invalid site.",
    });
    return;
  }
  await interaction.deferUpdate();
  setBusinessFocus(uid, key);
  const prisma = getBotPrisma();
  const slot = await prisma.economyBusinessSlot.findUnique({
    where: { ownerId_businessKey: { ownerId: uid, businessKey: key } },
  });
  if (!slot) {
    clearBusinessFocus(uid);
    await interaction.followUp({
      ephemeral: true,
      content: "You don't own that site anymore.",
    });
    await restoreBusinessMenuMessage(interaction, uid);
    return;
  }
  const ctx = await loadBusinessMenuContext(uid);
  const embed = await buildBusinessMenuEmbed(ctx);
  const rows = buildBusinessMenuRows(ctx);
  await interaction.editReply({
    content: `<@${uid}>`,
    embeds: [embed],
    components: rows,
    allowedMentions: { users: [uid] },
  });
}

export async function handleBusinessBackToMenu(
  interaction: MessageComponentInteraction,
  uid: string,
): Promise<void> {
  if (!isGuildTextBusinessInteraction(interaction)) {
    await interaction.reply({
      ephemeral: true,
      content: "Use **`.business`** in a **server text channel**.",
    });
    return;
  }
  await interaction.deferUpdate();
  clearBusinessFocus(uid);
  await restoreBusinessMenuMessage(interaction, uid);
}

export async function handleBusinessTrackUpgrade(
  interaction: MessageComponentInteraction,
  uid: string,
  track: BusinessTrackLetter,
): Promise<void> {
  if (!isGuildTextBusinessInteraction(interaction)) {
    await interaction.reply({
      ephemeral: true,
      content: "Use **`.business`** in a **server text channel**.",
    });
    return;
  }
  const key = peekBusinessFocus(uid);
  if (!key) {
    await interaction.reply({
      ephemeral: true,
      content: "Pick a site from the menu again — that panel expired.",
    });
    return;
  }
  await interaction.deferUpdate();
  const now = Date.now();
  try {
    const res = await runTrackUpgrade(uid, now, key, track);
    await interaction.followUp({
      ephemeral: true,
      content:
        `**${BUSINESS_DISPLAY_NAME[key]}** · **${TRACK_LABEL[track]}** → level **${res.newLevel}**. ` +
        `Paid **${formatCash(res.price)}** + **${formatCash(res.tax)}** tax · Balance **${formatCash(res.cashAfter)}**.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "MISSING") {
      await interaction.followUp({
        ephemeral: true,
        content: "Site not found.",
      });
    } else if (msg === "TRACK_MAX") {
      await interaction.followUp({
        ephemeral: true,
        content: "That track is already maxed.",
      });
    } else if (msg === "POOR") {
      await interaction.followUp({
        ephemeral: true,
        content: "Not enough cash (including tax).",
      });
    } else {
      await interaction.followUp({
        ephemeral: true,
        content: "Upgrade failed — try again.",
      });
    }
  }
  const ctx = await loadBusinessMenuContext(uid);
  const embed = await buildBusinessMenuEmbed(ctx);
  const rows = buildBusinessMenuRows(ctx);
  await interaction.editReply({
    content: `<@${uid}>`,
    embeds: [embed],
    components: rows,
    allowedMentions: { users: [uid] },
  });
}

export async function handleBusinessEventComply(
  interaction: MessageComponentInteraction,
  uid: string,
  eventId: string,
): Promise<void> {
  if (!isGuildTextBusinessInteraction(interaction)) {
    await interaction.reply({
      ephemeral: true,
      content: "Use **`.business`** in a **server text channel**.",
    });
    return;
  }
  await interaction.deferUpdate();
  const r = await resolveInspectionComply(uid, eventId, Date.now());
  if (r === "ok") {
    await interaction.followUp({
      ephemeral: true,
      content: "🚨 Inspection passed — no fine.",
    });
  } else if (r === "gone") {
    await interaction.followUp({
      ephemeral: true,
      content: "That inspection already timed out or was cleared — refresh the menu.",
    });
  } else {
    await interaction.followUp({
      ephemeral: true,
      content: "That button doesn’t match an active inspection.",
    });
  }
  await restoreBusinessMenuMessage(interaction, uid);
}

export async function handleBusinessEventRepair(
  interaction: MessageComponentInteraction,
  uid: string,
  eventId: string,
): Promise<void> {
  if (!isGuildTextBusinessInteraction(interaction)) {
    await interaction.reply({
      ephemeral: true,
      content: "Use **`.business`** in a **server text channel**.",
    });
    return;
  }
  await interaction.deferUpdate();
  const r = await resolveFireRepair(uid, eventId, Date.now());
  if (r === "ok") {
    await interaction.followUp({
      ephemeral: true,
      content: "🛠️ Fire put out — no income penalty.",
    });
  } else if (r === "poor") {
    await interaction.followUp({
      ephemeral: true,
      content: "You can’t afford that repair right now.",
    });
  } else if (r === "gone") {
    await interaction.followUp({
      ephemeral: true,
      content: "That fire event already ended — refresh.",
    });
  } else {
    await interaction.followUp({
      ephemeral: true,
      content: "Invalid fire event.",
    });
  }
  await restoreBusinessMenuMessage(interaction, uid);
}

export async function handleBusinessEventIgnore(
  interaction: MessageComponentInteraction,
  uid: string,
  eventId: string,
): Promise<void> {
  if (!isGuildTextBusinessInteraction(interaction)) {
    await interaction.reply({
      ephemeral: true,
      content: "Use **`.business`** in a **server text channel**.",
    });
    return;
  }
  await interaction.deferUpdate();
  const r = await resolveFireIgnore(uid, eventId, Date.now());
  if (r === "ok") {
    await interaction.followUp({
      ephemeral: true,
      content:
        "🔥 Ignored — this site takes a **temporary income cut** until the debuff expires (shown as lower $/h).",
    });
  } else if (r === "gone") {
    await interaction.followUp({
      ephemeral: true,
      content: "That event already ended — refresh.",
    });
  } else {
    await interaction.followUp({
      ephemeral: true,
      content: "Invalid fire event.",
    });
  }
  await restoreBusinessMenuMessage(interaction, uid);
}
