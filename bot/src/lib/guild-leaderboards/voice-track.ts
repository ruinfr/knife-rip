import type { Guild, VoiceState } from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { isEconomyTrackedGuild } from "../economy/economy-guild-config";

const voiceSessions = new Map<string, number>();

function sessionKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

function isCountableVoiceChannel(guild: Guild, channelId: string | null): boolean {
  if (!channelId) return false;
  if (guild.afkChannelId === channelId) return false;
  return true;
}

async function addVoiceSeconds(
  guildId: string,
  userId: string,
  seconds: number,
): Promise<void> {
  if (seconds <= 0) return;
  const prisma = getBotPrisma();
  const delta = BigInt(seconds);
  await prisma.botGuildMemberVoiceStats.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId, voiceSeconds: delta },
    update: { voiceSeconds: { increment: delta } },
  });
}

function flushSession(guildId: string, userId: string): void {
  const key = sessionKey(guildId, userId);
  const started = voiceSessions.get(key);
  if (started === undefined) return;
  voiceSessions.delete(key);
  const seconds = Math.floor((Date.now() - started) / 1000);
  void addVoiceSeconds(guildId, userId, seconds).catch(() => {});
}

/**
 * Track time in voice for `.vlb`. Run **before** VoiceMaster so hub → temp moves
 * are reflected by a second voice update (short hub stint is negligible).
 */
export function handleGuildVoiceLeaderboardState(
  oldS: VoiceState,
  newS: VoiceState,
): void {
  const guild = newS.guild ?? oldS.guild;
  if (!guild) return;
  if (!isEconomyTrackedGuild(guild.id)) return;

  const userId = newS.id;
  const oldId = oldS.channelId;
  const newId = newS.channelId;

  if (oldId === newId) return;

  if (oldId && isCountableVoiceChannel(guild, oldId)) {
    flushSession(guild.id, userId);
  }

  if (newId && isCountableVoiceChannel(guild, newId)) {
    voiceSessions.set(sessionKey(guild.id, userId), Date.now());
  }
}
