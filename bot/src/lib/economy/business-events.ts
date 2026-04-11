import { randomInt } from "crypto";
import type { EconomyBusinessEvent } from "@prisma/client";
import { getBotPrisma } from "../db-prisma";
import {
  businessSlotRowToAccrualInput,
  computeBusinessAccrued,
  computeBusinessHourlyRate,
} from "./business-accrual";
import {
  BUSINESS_BASE_PRICES,
  BUSINESS_EVENT_FIRE_IGNORE_DEBUFF_BPS,
  BUSINESS_EVENT_FIRE_IGNORE_DEBUFF_MS,
  BUSINESS_EVENT_FIRE_MS,
  BUSINESS_EVENT_FIRE_REPAIR_BASE_PCT,
  BUSINESS_EVENT_INSPECTION_MS,
  BUSINESS_EVENT_INSPECTION_PENALTY_CAP,
  BUSINESS_EVENT_INSPECTION_PENALTY_PCT,
  BUSINESS_EVENT_ROLL_COOLDOWN_MS,
  BUSINESS_EVENT_ROLL_PERMILLE,
  BUSINESS_EVENT_RUSH_INCOME_MULT_BPS,
  BUSINESS_EVENT_RUSH_MS,
  BUSINESS_EVENT_TIP_MAX_MULT_BPS,
  BUSINESS_EVENT_TIP_MIN_MULT_BPS,
  BUSINESS_STAFF_INSPECTION_MITIGATE_PCT_PER_LEVEL,
  parseBusinessKey,
  type BusinessKey,
} from "./economy-tuning";
import type { LedgerReason, Tx } from "./wallet";

export type BusinessEventKind =
  | "rush_hour"
  | "inspection"
  | "tip_jar"
  | "fire";

/** Active income multiplier from rush hour on this site (10_000 = 1×). */
export function rushIncomeMultBpsForKey(
  events: Pick<EconomyBusinessEvent, "kind" | "businessKey" | "expiresAt" | "resolved">[],
  businessKey: string,
  nowMs: number,
): number {
  const now = new Date(nowMs);
  const hit = events.find(
    (e) =>
      !e.resolved &&
      e.expiresAt > now &&
      e.kind === "rush_hour" &&
      e.businessKey === businessKey,
  );
  return hit ? BUSINESS_EVENT_RUSH_INCOME_MULT_BPS : 10_000;
}

export async function clearExpiredSlotDebuffs(
  tx: Tx,
  ownerId: string,
  nowMs: number,
): Promise<void> {
  const now = new Date(nowMs);
  await tx.economyBusinessSlot.updateMany({
    where: {
      ownerId,
      debuffUntil: { lte: now },
    },
    data: { debuffBps: 0, debuffUntil: null },
  });
}

export async function processExpiredBusinessEvents(
  tx: Tx,
  ownerId: string,
  nowMs: number,
): Promise<void> {
  const now = new Date(nowMs);
  const expired = await tx.economyBusinessEvent.findMany({
    where: {
      ownerId,
      resolved: false,
      expiresAt: { lte: now },
    },
  });

  for (const ev of expired) {
    if (ev.kind === "rush_hour" || ev.kind === "tip_jar") {
      await tx.economyBusinessEvent.update({
        where: { id: ev.id },
        data: { resolved: true },
      });
      continue;
    }

    if (ev.kind === "inspection") {
      const u = await tx.economyUser.findUnique({
        where: { discordUserId: ownerId },
      });
      if (u) {
        const slot = await tx.economyBusinessSlot.findFirst({
          where: { ownerId, businessKey: ev.businessKey },
        });
        const staff = slot?.staffLevel ?? 0;
        const mitig = Math.min(
          100,
          BUSINESS_STAFF_INSPECTION_MITIGATE_PCT_PER_LEVEL * staff,
        );
        const bps = Math.max(
          0,
          Math.floor(
            (BUSINESS_EVENT_INSPECTION_PENALTY_PCT * 100 * (100 - mitig)) / 100,
          ),
        );
        let loss = (u.cash * BigInt(bps) + 9_999n) / 10_000n;
        if (loss > BUSINESS_EVENT_INSPECTION_PENALTY_CAP) {
          loss = BUSINESS_EVENT_INSPECTION_PENALTY_CAP;
        }
        if (loss > u.cash) loss = u.cash;
        if (loss > 0n) {
          const cashAfter = u.cash - loss;
          await tx.economyUser.update({
            where: { discordUserId: ownerId },
            data: { cash: cashAfter },
          });
          await tx.economyLedger.create({
            data: {
              discordUserId: ownerId,
              delta: -loss,
              balanceAfter: cashAfter,
              reason: "business" satisfies LedgerReason,
              meta: {
                op: "event_inspection_fail",
                eventId: ev.id,
                bps,
              },
            },
          });
        }
      }
      await tx.economyBusinessEvent.update({
        where: { id: ev.id },
        data: { resolved: true },
      });
      continue;
    }

    if (ev.kind === "fire") {
      const meta = (ev.meta ?? {}) as Record<string, unknown>;
      if (meta.repaired === true || meta.ignored === true) {
        await tx.economyBusinessEvent.update({
          where: { id: ev.id },
          data: { resolved: true },
        });
        continue;
      }
      const until = new Date(nowMs + BUSINESS_EVENT_FIRE_IGNORE_DEBUFF_MS);
      await tx.economyBusinessSlot.updateMany({
        where: { ownerId, businessKey: ev.businessKey },
        data: {
          debuffBps: BUSINESS_EVENT_FIRE_IGNORE_DEBUFF_BPS,
          debuffUntil: until,
        },
      });
      await tx.economyBusinessEvent.update({
        where: { id: ev.id },
        data: {
          resolved: true,
          meta: { ...meta, autoIgnored: true },
        },
      });
    }
  }
}

export async function runAutomationSweep(tx: Tx, ownerId: string, nowMs: number) {
  const now = new Date(nowMs);
  const active = await tx.economyBusinessEvent.findMany({
    where: {
      ownerId,
      resolved: false,
      expiresAt: { gt: now },
    },
  });

  const slots = await tx.economyBusinessSlot.findMany({
    where: { ownerId },
  });

  let gain = 0n;
  const lines: string[] = [];

  for (const s of slots) {
    if (s.automationLevel < 1) continue;
    const k = parseBusinessKey(s.businessKey);
    if (!k) continue;
    const rushBps = rushIncomeMultBpsForKey(active, s.businessKey, nowMs);
    const acc = computeBusinessAccrued(
      k,
      businessSlotRowToAccrualInput(s),
      nowMs,
      { incomeMultBps: rushBps },
    );
    if (acc <= 0n) continue;
    gain += acc;
    lines.push(`${s.businessKey}:${acc.toString()}`);
    await tx.economyBusinessSlot.update({
      where: { id: s.id },
      data: { lastCollectedAt: now },
    });
  }

  if (gain <= 0n) return { gain: 0n, lines: [] as string[] };

  const u = await tx.economyUser.findUnique({
    where: { discordUserId: ownerId },
  });
  if (!u) return { gain: 0n, lines: [] as string[] };

  const cashAfter = u.cash + gain;
  await tx.economyUser.update({
    where: { discordUserId: ownerId },
    data: { cash: cashAfter },
  });
  await tx.economyLedger.create({
    data: {
      discordUserId: ownerId,
      delta: gain,
      balanceAfter: cashAfter,
      reason: "business" satisfies LedgerReason,
      meta: { op: "auto_collect", detail: lines.slice(0, 12) },
    },
  });
  return { gain, lines };
}

export async function prepareBusinessEconomyPass(ownerId: string, nowMs: number) {
  const prisma = getBotPrisma();
  let autoGain = 0n;
  await prisma.$transaction(async (tx) => {
    await clearExpiredSlotDebuffs(tx, ownerId, nowMs);
    await processExpiredBusinessEvents(tx, ownerId, nowMs);
    const res = await runAutomationSweep(tx, ownerId, nowMs);
    autoGain = res.gain;
  });
  await tryRollRandomBusinessEvent(ownerId, nowMs);
  return { autoGain };
}

async function tryRollRandomBusinessEvent(
  ownerId: string,
  nowMs: number,
): Promise<void> {
  const prisma = getBotPrisma();
  const slots = await prisma.economyBusinessSlot.findMany({
    where: { ownerId },
    select: { businessKey: true },
  });
  if (slots.length === 0) return;

  const activeCount = await prisma.economyBusinessEvent.count({
    where: {
      ownerId,
      resolved: false,
      expiresAt: { gt: new Date(nowMs) },
    },
  });
  if (activeCount > 0) return;

  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: ownerId },
    select: { businessEventLastRollAt: true },
  });
  const last = u?.businessEventLastRollAt?.getTime() ?? 0;
  if (nowMs - last < BUSINESS_EVENT_ROLL_COOLDOWN_MS) return;

  if (randomInt(1_000) >= BUSINESS_EVENT_ROLL_PERMILLE) {
    await prisma.economyUser.update({
      where: { discordUserId: ownerId },
      data: { businessEventLastRollAt: new Date(nowMs) },
    });
    return;
  }

  const pick = slots[randomInt(0, slots.length)]!;
  const key = parseBusinessKey(pick.businessKey);
  if (!key) {
    await prisma.economyUser.update({
      where: { discordUserId: ownerId },
      data: { businessEventLastRollAt: new Date(nowMs) },
    });
    return;
  }

  const kinds: BusinessEventKind[] = [
    "rush_hour",
    "inspection",
    "tip_jar",
    "fire",
  ];
  const kind = kinds[randomInt(kinds.length)]!;

  await prisma.$transaction(async (tx) => {
    const again = await tx.economyBusinessEvent.count({
      where: {
        ownerId,
        resolved: false,
        expiresAt: { gt: new Date(nowMs) },
      },
    });
    if (again > 0) return;

    const slot = await tx.economyBusinessSlot.findUnique({
      where: {
        ownerId_businessKey: { ownerId, businessKey: key },
      },
    });
    if (!slot) return;

    const accIn = businessSlotRowToAccrualInput(slot);
    const expiresAt = new Date(nowMs);

    if (kind === "rush_hour") {
      expiresAt.setTime(nowMs + BUSINESS_EVENT_RUSH_MS);
      await tx.economyBusinessEvent.create({
        data: {
          ownerId,
          businessKey: key,
          kind,
          expiresAt,
          meta: { multBps: BUSINESS_EVENT_RUSH_INCOME_MULT_BPS },
        },
      });
    } else if (kind === "inspection") {
      expiresAt.setTime(nowMs + BUSINESS_EVENT_INSPECTION_MS);
      await tx.economyBusinessEvent.create({
        data: {
          ownerId,
          businessKey: key,
          kind,
          expiresAt,
          meta: {},
        },
      });
    } else if (kind === "tip_jar") {
      const multBps = randomInt(
        BUSINESS_EVENT_TIP_MIN_MULT_BPS,
        BUSINESS_EVENT_TIP_MAX_MULT_BPS + 1,
      );
      const hourly = computeBusinessHourlyRate(key, accIn);
      const tip = (hourly * BigInt(multBps)) / 10_000n;
      expiresAt.setTime(nowMs + 60_000);
      const row = await tx.economyBusinessEvent.create({
        data: {
          ownerId,
          businessKey: key,
          kind,
          expiresAt,
          resolved: true,
          meta: { multBps, tip: tip.toString() },
        },
      });
      const usr = await tx.economyUser.findUnique({
        where: { discordUserId: ownerId },
      });
      if (usr && tip > 0n) {
        const cashAfter = usr.cash + tip;
        await tx.economyUser.update({
          where: { discordUserId: ownerId },
          data: { cash: cashAfter },
        });
        await tx.economyLedger.create({
          data: {
            discordUserId: ownerId,
            delta: tip,
            balanceAfter: cashAfter,
            reason: "business" satisfies LedgerReason,
            meta: { op: "event_tip_jar", eventId: row.id },
          },
        });
      }
    } else {
      const base = BUSINESS_BASE_PRICES[key];
      const repair =
        (base * BigInt(BUSINESS_EVENT_FIRE_REPAIR_BASE_PCT) + 99n) / 100n;
      expiresAt.setTime(nowMs + BUSINESS_EVENT_FIRE_MS);
      await tx.economyBusinessEvent.create({
        data: {
          ownerId,
          businessKey: key,
          kind: "fire",
          expiresAt,
          meta: { repair: repair.toString() },
        },
      });
    }

    await tx.economyUser.update({
      where: { discordUserId: ownerId },
      data: { businessEventLastRollAt: new Date(nowMs) },
    });
  });
}

export function formatActiveEventBanner(
  events: EconomyBusinessEvent[],
  nowMs: number,
): string {
  const now = new Date(nowMs);
  const open = events.filter(
    (e) => !e.resolved && e.expiresAt > now,
  );
  if (open.length === 0) return "";

  const lines: string[] = ["**🔔 Active events**"];
  for (const e of open) {
    const k = parseBusinessKey(e.businessKey);
    const name = k ? `**${e.businessKey}**` : e.businessKey;
    const t = Math.floor(e.expiresAt.getTime() / 1000);
    if (e.kind === "rush_hour") {
      lines.push(`🏆 **Rush hour** on ${name} — **2× income** · ends <t:${t}:R>`);
    } else if (e.kind === "inspection") {
      lines.push(
        `🚨 **Health inspection** on ${name} — **Comply** below or pay a fine when time’s up (Staff reduces the fine). <t:${t}:R>`,
      );
    } else if (e.kind === "fire") {
      lines.push(
        `🔥 **Fire** at ${name} — **Repair** (cost) or **Ignore** (long income penalty on this site). <t:${t}:R>`,
      );
    }
  }
  return lines.join("\n") + "\n\n";
}

export function blockingEventForUi(
  events: EconomyBusinessEvent[],
  nowMs: number,
): EconomyBusinessEvent | null {
  const now = new Date(nowMs);
  const open = events.filter(
    (e) => !e.resolved && e.expiresAt > now,
  );
  return (
    open.find((e) => e.kind === "inspection") ??
    open.find((e) => e.kind === "fire") ??
    null
  );
}

export function eventRepairCostBigint(ev: EconomyBusinessEvent): bigint {
  const meta = (ev.meta ?? {}) as Record<string, unknown>;
  const r = meta.repair;
  if (typeof r === "string" && /^\d+$/.test(r)) return BigInt(r);
  return 0n;
}

export async function resolveInspectionComply(
  ownerId: string,
  eventId: string,
  nowMs: number,
): Promise<"ok" | "gone" | "wrong"> {
  const prisma = getBotPrisma();
  const ev = await prisma.economyBusinessEvent.findFirst({
    where: { id: eventId, ownerId },
  });
  if (!ev || ev.kind !== "inspection") return "wrong";
  if (ev.resolved) return "gone";
  if (ev.expiresAt.getTime() <= nowMs) return "gone";
  await prisma.economyBusinessEvent.update({
    where: { id: eventId },
    data: { resolved: true, meta: { complied: true } },
  });
  return "ok";
}

export async function resolveFireRepair(
  ownerId: string,
  eventId: string,
  nowMs: number,
): Promise<"ok" | "poor" | "gone" | "wrong"> {
  const prisma = getBotPrisma();
  return prisma.$transaction(async (tx) => {
    const ev = await tx.economyBusinessEvent.findFirst({
      where: { id: eventId, ownerId },
    });
    if (!ev || ev.kind !== "fire") return "wrong";
    if (ev.resolved) return "gone";
    if (ev.expiresAt.getTime() <= nowMs) return "gone";
    const cost = eventRepairCostBigint(ev);
    const u = await tx.economyUser.findUnique({
      where: { discordUserId: ownerId },
    });
    if (!u || u.cash < cost) return "poor";
    const cashAfter = u.cash - cost;
    await tx.economyUser.update({
      where: { discordUserId: ownerId },
      data: { cash: cashAfter },
    });
    await tx.economyLedger.create({
      data: {
        discordUserId: ownerId,
        delta: -cost,
        balanceAfter: cashAfter,
        reason: "business" satisfies LedgerReason,
        meta: { op: "event_fire_repair", eventId },
      },
    });
    await tx.economyBusinessEvent.update({
      where: { id: eventId },
      data: { resolved: true, meta: { repaired: true } },
    });
    return "ok";
  });
}

export async function resolveFireIgnore(
  ownerId: string,
  eventId: string,
  nowMs: number,
): Promise<"ok" | "gone" | "wrong"> {
  const prisma = getBotPrisma();
  return prisma.$transaction(async (tx) => {
    const ev = await tx.economyBusinessEvent.findFirst({
      where: { id: eventId, ownerId },
    });
    if (!ev || ev.kind !== "fire") return "wrong";
    if (ev.resolved) return "gone";
    if (ev.expiresAt.getTime() <= nowMs) return "gone";
    const until = new Date(nowMs + BUSINESS_EVENT_FIRE_IGNORE_DEBUFF_MS);
    await tx.economyBusinessSlot.updateMany({
      where: { ownerId, businessKey: ev.businessKey },
      data: {
        debuffBps: BUSINESS_EVENT_FIRE_IGNORE_DEBUFF_BPS,
        debuffUntil: until,
      },
    });
    await tx.economyBusinessEvent.update({
      where: { id: eventId },
      data: { resolved: true, meta: { ignored: true } },
    });
    return "ok";
  });
}
