import { randomBytes } from "crypto";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { EdgeTTS } from "node-edge-tts";

/** English (US) neural voice via Microsoft Edge’s online TTS — no API key. */
export async function synthesizeSpeechMp3(text: string): Promise<Buffer> {
  const tts = new EdgeTTS({
    voice: "en-US-JennyNeural",
    lang: "en-US",
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    saveSubtitles: false,
    timeout: 120_000,
  });

  const name = `knife-tts-${randomBytes(12).toString("hex")}.mp3`;
  const audioPath = join(tmpdir(), name);
  try {
    await tts.ttsPromise(text, audioPath);
    return await readFile(audioPath);
  } finally {
    await unlink(audioPath).catch(() => {});
  }
}
