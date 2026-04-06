import type { Message } from "discord.js";
import { PREFIX } from "../../config";
import { getTtsBindChannel } from "./binding-store";
import { enqueueVoiceTts, isVoiceTtsActiveInGuild } from "./voice-player";
import { sanitizeTextForTts } from "./sanitize";

/**
 * When the bot is in a voice session and the message is in the bound text channel,
 * queue TTS (prefix lines are treated as commands, not read aloud).
 * @returns true if this message was consumed for TTS (skip further handling).
 */
export function handleBoundChannelTtsMessage(message: Message): boolean {
  if (!message.guild) return false;
  if (!isVoiceTtsActiveInGuild(message.guild.id)) return false;
  const bound = getTtsBindChannel(message.guild.id);
  if (!bound || message.channel.id !== bound) return false;
  if (message.author.bot) return false;

  const raw = message.content.trim();
  if (!raw) return false;
  if (raw.startsWith(PREFIX)) return false;

  const text = sanitizeTextForTts(raw);
  if (!text) return false;

  enqueueVoiceTts(message.guild.id, text);
  return true;
}
