import {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
  type AudioPlayer,
  type VoiceConnection,
} from "@discordjs/voice";
import type { Guild, GuildMember, VoiceBasedChannel } from "discord.js";
import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import { synthesizeSpeechMp3 } from "../tts-edge";

type Session = {
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: string[];
  busy: boolean;
};

const sessions = new Map<string, Session>();

function mp3BufferToAudioResource(mp3: Buffer) {
  const ff = ffmpegStatic;
  if (!ff) {
    throw new Error("ffmpeg-static is not available — VC TTS cannot decode audio");
  }
  const proc = spawn(
    ff,
    [
      "-i",
      "pipe:0",
      "-analyzeduration",
      "0",
      "-loglevel",
      "0",
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "2",
      "pipe:1",
    ],
    { stdio: ["pipe", "pipe", "ignore"] },
  );
  proc.stdin.end(mp3);
  return createAudioResource(proc.stdout, {
    inputType: StreamType.Raw,
  });
}

async function drainVoiceTtsQueue(guildId: string): Promise<void> {
  const s = sessions.get(guildId);
  if (!s || s.busy) return;
  if (s.queue.length === 0) return;

  s.busy = true;
  const line = s.queue.shift()!;
  try {
    const mp3 = await synthesizeSpeechMp3(line);
    const resource = mp3BufferToAudioResource(mp3);
    s.player.play(resource);
    await entersState(s.player, AudioPlayerStatus.Playing, 15_000).catch(
      () => {},
    );
    await entersState(s.player, AudioPlayerStatus.Idle, 300_000);
  } catch (e) {
    console.error("[vc-tts] play error:", e);
  } finally {
    s.busy = false;
    if (s.queue.length > 0) void drainVoiceTtsQueue(guildId);
  }
}

export function enqueueVoiceTts(guildId: string, text: string): void {
  const s = sessions.get(guildId);
  if (!s || !text) return;
  s.queue.push(text);
  void drainVoiceTtsQueue(guildId);
}

export function isVoiceTtsActiveInGuild(guildId: string): boolean {
  return getVoiceConnection(guildId) != null && sessions.has(guildId);
}

export async function joinVoiceForTts(
  guild: Guild,
  voiceChannel: VoiceBasedChannel,
  _member: GuildMember,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = guild.members.me;
  if (!me?.voice) {
    return { ok: false, error: "Bot member not available." };
  }

  const perms = voiceChannel.permissionsFor(me);
  if (
    !perms?.has(["Connect", "Speak", "ViewChannel"]) ||
    !voiceChannel.joinable
  ) {
    return {
      ok: false,
      error:
        "I need **Connect**, **Speak**, and **View Channel** in that voice channel.",
    };
  }

  const existing = getVoiceConnection(guild.id);
  existing?.destroy();
  sessions.delete(guild.id);

  let connection: VoiceConnection;
  try {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Could not join voice: ${msg.slice(0, 200)}` };
  }

  const player = createAudioPlayer();
  connection.subscribe(player);

  sessions.set(guild.id, {
    connection,
    player,
    queue: [],
    busy: false,
  });

  return { ok: true };
}

export function leaveVoiceTts(guildId: string): boolean {
  const conn = getVoiceConnection(guildId);
  conn?.destroy();
  return sessions.delete(guildId);
}
