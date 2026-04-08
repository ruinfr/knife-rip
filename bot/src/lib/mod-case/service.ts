import type { Client, EmbedBuilder } from "discord.js";
import type { BotModCaseKind, Prisma } from "@prisma/client";
import { getBotPrisma } from "../db-prisma";

const prisma = () => getBotPrisma();

export async function nextCaseNum(guildId: string): Promise<number> {
  const agg = await prisma().botGuildModCase.aggregate({
    where: { guildId },
    _max: { caseNum: true },
  });
  return (agg._max.caseNum ?? 0) + 1;
}

export async function createModCase(params: {
  guildId: string;
  kind: BotModCaseKind;
  actorUserId: string;
  targetUserId: string;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<{ id: string; caseNum: number }> {
  const caseNum = await nextCaseNum(params.guildId);
  const row = await prisma().botGuildModCase.create({
    data: {
      guildId: params.guildId,
      caseNum,
      kind: params.kind,
      actorUserId: params.actorUserId,
      targetUserId: params.targetUserId,
      reason: params.reason ?? undefined,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
  return { id: row.id, caseNum: row.caseNum };
}

export async function findCaseByGuildNum(
  guildId: string,
  caseNum: number,
): Promise<
  | (Prisma.BotGuildModCaseGetPayload<{
      include: { proofs: true };
    }>)
  | null
> {
  return prisma().botGuildModCase.findUnique({
    where: { guildId_caseNum: { guildId, caseNum } },
    include: { proofs: { orderBy: { sortIndex: "asc" } } },
  });
}

export async function findCaseById(
  modCaseId: string,
): Promise<
  | (Prisma.BotGuildModCaseGetPayload<{
      include: { proofs: true };
    }>)
  | null
> {
  return prisma().botGuildModCase.findUnique({
    where: { id: modCaseId },
    include: { proofs: { orderBy: { sortIndex: "asc" } } },
  });
}

export async function listCasesForTarget(
  guildId: string,
  targetUserId: string,
  take = 25,
): Promise<Prisma.BotGuildModCaseGetPayload<object>[]> {
  return prisma().botGuildModCase.findMany({
    where: { guildId, targetUserId },
    orderBy: { caseNum: "desc" },
    take,
  });
}

export async function listCasesForActor(
  guildId: string,
  actorUserId: string,
  take = 25,
): Promise<Prisma.BotGuildModCaseGetPayload<object>[]> {
  return prisma().botGuildModCase.findMany({
    where: { guildId, actorUserId },
    orderBy: { caseNum: "desc" },
    take,
  });
}

export async function listRecentCases(
  guildId: string,
  take = 20,
): Promise<Prisma.BotGuildModCaseGetPayload<object>[]> {
  return prisma().botGuildModCase.findMany({
    where: { guildId },
    orderBy: { caseNum: "desc" },
    take,
  });
}

export async function updateCaseReason(
  guildId: string,
  caseNum: number,
  reason: string,
): Promise<boolean> {
  const r = await prisma().botGuildModCase.updateMany({
    where: { guildId, caseNum },
    data: { reason: reason.slice(0, 2000) },
  });
  return r.count > 0;
}

export async function deleteCase(
  guildId: string,
  caseNum: number,
): Promise<boolean> {
  const r = await prisma().botGuildModCase.deleteMany({
    where: { guildId, caseNum },
  });
  return r.count > 0;
}

export async function deleteAllCasesForTarget(
  guildId: string,
  targetUserId: string,
): Promise<number> {
  const r = await prisma().botGuildModCase.deleteMany({
    where: { guildId, targetUserId },
  });
  return r.count;
}

export async function addProof(params: {
  modCaseId: string;
  url?: string | null;
  note?: string | null;
}): Promise<void> {
  const max = await prisma().botGuildModCaseProof.aggregate({
    where: { modCaseId: params.modCaseId },
    _max: { sortIndex: true },
  });
  const sortIndex = (max._max.sortIndex ?? -1) + 1;
  await prisma().botGuildModCaseProof.create({
    data: {
      modCaseId: params.modCaseId,
      url: params.url ?? undefined,
      note: params.note ?? undefined,
      sortIndex,
    },
  });
}

export async function deleteProofByIndex(
  modCaseId: string,
  zeroBasedIndex: number,
): Promise<boolean> {
  const proofs = await prisma().botGuildModCaseProof.findMany({
    where: { modCaseId },
    orderBy: { sortIndex: "asc" },
  });
  const p = proofs[zeroBasedIndex];
  if (!p) return false;
  await prisma().botGuildModCaseProof.delete({ where: { id: p.id } });
  return true;
}

export async function setProofExplanation(
  modCaseId: string,
  note: string,
): Promise<boolean> {
  const first = await prisma().botGuildModCaseProof.findFirst({
    where: { modCaseId },
    orderBy: { sortIndex: "asc" },
  });
  if (!first) return false;
  await prisma().botGuildModCaseProof.update({
    where: { id: first.id },
    data: { note: note.slice(0, 2000) },
  });
  return true;
}

export async function getModLogChannelId(
  guildId: string,
): Promise<string | null> {
  const row = await prisma().botGuildModSettings.findUnique({
    where: { guildId },
    select: { modLogChannelId: true },
  });
  return row?.modLogChannelId ?? null;
}

export async function setModLogChannelId(
  guildId: string,
  channelId: string | null,
): Promise<void> {
  await prisma().botGuildModSettings.upsert({
    where: { guildId },
    create: { guildId, modLogChannelId: channelId },
    update: { modLogChannelId: channelId },
  });
}

export async function sendModLogEmbed(
  client: Client,
  guildId: string,
  embed: EmbedBuilder,
): Promise<void> {
  const chId = await getModLogChannelId(guildId);
  if (!chId) return;
  const ch = await client.channels.fetch(chId).catch(() => null);
  if (ch?.isTextBased() && !ch.isDMBased()) {
    await ch.send({ embeds: [embed] }).catch(() => {});
  }
}

export function caseStatsByKind(
  cases: { kind: BotModCaseKind }[],
): Map<BotModCaseKind, number> {
  const m = new Map<BotModCaseKind, number>();
  for (const c of cases) {
    m.set(c.kind, (m.get(c.kind) ?? 0) + 1);
  }
  return m;
}

export type MetadataFilter = {
  commandKey?: string;
};

export function metadataMatches(
  meta: Prisma.JsonValue | null,
  filter: MetadataFilter,
): boolean {
  if (!filter.commandKey) return true;
  if (meta === null || typeof meta !== "object" || Array.isArray(meta)) {
    return false;
  }
  const cmd = (meta as Record<string, Prisma.JsonValue>).commandKey;
  return typeof cmd === "string" && cmd === filter.commandKey;
}
