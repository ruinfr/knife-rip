import type { Client, GuildMember } from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { economyPayoutMultiplier } from "./boost";
import {
  GAMBLE_MULT_MAX,
  PET_GAMBLE_BONUS_MAX,
  PET_GAMBLE_BONUS_PER_STEP,
  PET_GAMBLE_BONUS_XP_STEP,
  PET_GAMBLE_COMBINED_MAX,
  PET_HAPPY_GAMBLE_EXTRA,
  PET_HAPPY_GAMBLE_THRESHOLD,
} from "./economy-tuning";

/**
 * Equipped-pet slice of the gamble payout multiplier: XP milestones + tiny happiness bonus, combined-capped.
 */
export function computeEquippedPetGambleBonus(xp: number, happiness: number): {
  total: number;
  xpPart: number;
  happyPart: number;
} {
  const xpPart = Math.min(
    PET_GAMBLE_BONUS_MAX,
    Math.floor(xp / PET_GAMBLE_BONUS_XP_STEP) * PET_GAMBLE_BONUS_PER_STEP,
  );
  const rawHappy =
    happiness >= PET_HAPPY_GAMBLE_THRESHOLD ? PET_HAPPY_GAMBLE_EXTRA : 0;
  const total = Math.min(PET_GAMBLE_COMBINED_MAX, xpPart + rawHappy);
  const happyPart = Math.max(0, total - xpPart);
  return { total, xpPart, happyPart };
}

function petGambleBonusFromPet(xp: number, happiness: number): number {
  return computeEquippedPetGambleBonus(xp, happiness).total;
}

/** One-line footer for `.pets` menu (Discord footer max 2048). */
export function describePetXpBonusProgress(xp: number): string {
  const steps = Math.floor(xp / PET_GAMBLE_BONUS_XP_STEP);
  const xpPart = Math.min(
    PET_GAMBLE_BONUS_MAX,
    steps * PET_GAMBLE_BONUS_PER_STEP,
  );
  if (xpPart >= PET_GAMBLE_BONUS_MAX) {
    return `XP path is **maxed** (+${(PET_GAMBLE_BONUS_MAX * 100).toFixed(0)}%).`;
  }
  const xpNeed = (steps + 1) * PET_GAMBLE_BONUS_XP_STEP;
  const delta = xpNeed - xp;
  return `Next **+${(PET_GAMBLE_BONUS_PER_STEP * 100).toFixed(0)}%** from XP at **${xpNeed.toLocaleString()}** XP (**${delta.toLocaleString()}** to go).`;
}

export function describePetHappinessBonusLine(happiness: number): string {
  if (happiness >= PET_HAPPY_GAMBLE_THRESHOLD) {
    return `Happiness **${happiness}** — **+${(PET_HAPPY_GAMBLE_EXTRA * 100).toFixed(1)}%** slice unlocked (pet total still capped).`;
  }
  return `Happiness **${happiness}** — reach **${PET_HAPPY_GAMBLE_THRESHOLD}+** for up to **+${(PET_HAPPY_GAMBLE_EXTRA * 100).toFixed(1)}%** extra.`;
}

/** Unicode only — Discord embed footers do not render guild custom emoji. */
const PET_UI = "\u{1F4B0}";

export function formatPetGambleFooterLine(
  equipped: { xp: number; happiness: number } | null,
): string {
  if (!equipped) {
    return `${PET_UI} Equip a pet for a small **.gamble** house-game bonus — \`.pet info\``;
  }
  const { total } = computeEquippedPetGambleBonus(equipped.xp, equipped.happiness);
  const capPct = (PET_GAMBLE_COMBINED_MAX * 100).toFixed(1);
  if (total <= 0) {
    return `${PET_UI} Equipped: gain XP (feed) for up to +${(PET_GAMBLE_BONUS_MAX * 100).toFixed(0)}% · happy ≥${PET_HAPPY_GAMBLE_THRESHOLD} adds +${(PET_HAPPY_GAMBLE_EXTRA * 100).toFixed(1)}% — \`.pet info\``;
  }
  return `${PET_UI} Equipped pet: **+${(total * 100).toFixed(1)}%** on **.gamble** payouts (pet cap **${capPct}%**) — \`.pet info\``;
}

export type ResolvedPayoutMultiplier = {
  /** Final multiplier applied to wins (boost + pet, capped). */
  mult: number;
  /** Additive slice from equipped pet only (for win messages). */
  petBonusAdd: number;
  /** Nitro / Pro / site entitlement slice before pet. */
  baseMult: number;
};

/**
 * House-game payout multiplier: Nitro/Pro boost eligibility + equipped pet bonus, hard-clamped.
 */
export async function resolvePayoutMultiplierDetails(params: {
  userId: string;
  member: GuildMember | null;
  client: Client;
}): Promise<ResolvedPayoutMultiplier> {
  const { userId, member, client } = params;
  const baseMult = await economyPayoutMultiplier(member, userId, client);

  const prisma = getBotPrisma();
  const equipped = await prisma.economyPet.findFirst({
    where: { ownerId: userId, equipped: true },
    select: { xp: true, happiness: true },
  });
  const petBonusAdd = equipped
    ? petGambleBonusFromPet(equipped.xp, equipped.happiness)
    : 0;
  const mult = Math.min(GAMBLE_MULT_MAX, baseMult + petBonusAdd);
  return { mult, petBonusAdd, baseMult };
}

export async function resolvePayoutMultiplier(params: {
  userId: string;
  member: GuildMember | null;
  client: Client;
}): Promise<number> {
  const d = await resolvePayoutMultiplierDetails(params);
  return d.mult;
}
