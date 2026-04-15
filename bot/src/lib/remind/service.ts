import { randomBytes } from "node:crypto";
import type { Client } from "discord.js";

import { userCanUseKnifeProFeatures } from "../pro-entitlement";
import {
  describeDuration,
  parseModerationDuration,
} from "../moderation-duration";

/** Cap how far ahead a Pro user can schedule */
export const MAX_REMIND_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
/** Avoid spam / tight timer abuse */
const MIN_REMIND_DELAY_MS = 30_000;
/** Max pending reminders per Discord user */
export const MAX_PENDING_PER_USER = 5;
/** Minimum time between *new* schedules per user */
export const MIN_SCHEDULE_GAP_MS = 20_000;

const lastScheduleAt = new Map<string, number>();

export type PendingReminder = {
  id: string;
  userId: string;
  text: string;
  firesAt: number;
  timeout: ReturnType<typeof setTimeout>;
};

const byUser = new Map<string, PendingReminder[]>();

export async function userCanUseRemind(userId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  return userCanUseKnifeProFeatures(userId, { commandLabel: ".remind" });
}

export function parseRemindDelay(raw: string): number | null {
  const ms = parseModerationDuration(raw.trim());
  if (ms == null) return null;
  if (ms < MIN_REMIND_DELAY_MS) return null;
  return Math.min(ms, MAX_REMIND_DELAY_MS);
}

function pushForUser(userId: string, entry: PendingReminder): void {
  const list = byUser.get(userId) ?? [];
  list.push(entry);
  byUser.set(userId, list);
}

function removeFromUser(userId: string, id: string): boolean {
  const list = byUser.get(userId);
  if (!list) return false;
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return false;
  const [removed] = list.splice(i, 1);
  clearTimeout(removed.timeout);
  if (list.length === 0) byUser.delete(userId);
  else byUser.set(userId, list);
  return true;
}

export function listPending(userId: string): PendingReminder[] {
  return [...(byUser.get(userId) ?? [])];
}

export function scheduleGapOk(userId: string): boolean {
  const t = lastScheduleAt.get(userId);
  if (t == null) return true;
  return Date.now() - t >= MIN_SCHEDULE_GAP_MS;
}

export function markScheduled(userId: string): void {
  lastScheduleAt.set(userId, Date.now());
}

export function countPending(userId: string): number {
  return byUser.get(userId)?.length ?? 0;
}

export function scheduleReminder(
  client: Client,
  userId: string,
  delayMs: number,
  text: string,
): PendingReminder {
  const id = randomBytes(3).toString("hex");
  const firesAt = Date.now() + delayMs;

  const timeout = setTimeout(() => {
    void fireReminder(client, userId, id, text);
  }, delayMs);

  const entry: PendingReminder = {
    id,
    userId,
    text,
    firesAt,
    timeout,
  };
  pushForUser(userId, entry);
  return entry;
}

async function fireReminder(
  client: Client,
  userId: string,
  id: string,
  text: string,
): Promise<void> {
  if (!removeFromUser(userId, id)) return;
  try {
    const user = await client.users.fetch(userId);
    const body =
      `⏰ **Reminder**\n\n${text}\n\n` +
      `_Scheduled with Arivix · you can set more with **.remind** (Pro)._`;
    await user.send({ content: body.slice(0, 2000) });
  } catch {
    /* DMs closed or blocked */
  }
}

export function cancelReminder(userId: string, id: string): boolean {
  return removeFromUser(userId, id);
}

export function cancelAllReminders(userId: string): number {
  const list = byUser.get(userId);
  if (!list?.length) return 0;
  const n = list.length;
  for (const r of list) clearTimeout(r.timeout);
  byUser.delete(userId);
  return n;
}
