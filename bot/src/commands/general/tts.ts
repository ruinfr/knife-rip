import { AttachmentBuilder } from "discord.js";
import { errorEmbed } from "../../lib/embeds";
import { synthesizeSpeechMp3 } from "../../lib/tts-edge";
import type { KnifeCommand } from "../types";

/** Discord attachment limit (non–Nitro boost tier) — stay under this. */
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_CHARS = 2000;

function safeFileNameSnippet(text: string): string {
  const base = text
    .slice(0, 40)
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return base.length > 0 ? base : "speech";
}

export const ttsCommand: KnifeCommand = {
  name: "tts",
  aliases: ["texttospeech", "text2speech"],
  description: "Text-to-speech — replies with your line as an MP3",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".tts your message · .texttospeech · .text2speech",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const text = args.join(" ").trim();
    if (!text) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.tts** `your message` · **.texttospeech** · **.text2speech** (spaces OK)",
          ),
        ],
      });
      return;
    }

    if (text.length > MAX_CHARS) {
      await message.reply({
        embeds: [
          errorEmbed(
            `Keep it under **${MAX_CHARS}** characters (you sent ${text.length}).`,
          ),
        ],
      });
      return;
    }

    const ch = message.channel;
    if (ch.isTextBased() && "sendTyping" in ch) {
      await ch.sendTyping().catch(() => {});
    }

    let buffer: Buffer;
    try {
      buffer = await synthesizeSpeechMp3(text);
    } catch (err) {
      console.error("[tts] synthesis failed:", err);
      await message.reply({
        embeds: [
          errorEmbed(
            "Couldn’t generate speech right now (service busy or network). Try shorter text in a moment.",
          ),
        ],
      });
      return;
    }

    if (buffer.length > MAX_ATTACHMENT_BYTES) {
      await message.reply({
        embeds: [
          errorEmbed(
            "That audio would be too large for Discord. Try a shorter message.",
          ),
        ],
      });
      return;
    }

    const snippet = safeFileNameSnippet(text);
    const file = new AttachmentBuilder(buffer, {
      name: `knife-tts-${snippet}.mp3`,
    });

    await message.reply({
      files: [file],
      allowedMentions: { parse: [] },
    });
  },
};
