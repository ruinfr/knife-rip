import { createHash, randomBytes } from "crypto";
import { createWriteStream } from "fs";
import { readFile, unlink } from "fs/promises";
import https from "https";
import { tmpdir } from "os";
import { join } from "path";
import { URL } from "url";
import { WebSocket } from "ws";

/**
 * Microsoft Edge read-aloud TTS over WebSocket (neural voice when it connects).
 * Microsoft often resets non-browser clients; we fall back to Google translate_tts.
 */
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const WIN_EPOCH_SEC = 11644473600;
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

const GOOGLE_CHUNK = 180;
const GOOGLE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function chromiumMajor(): string {
  return CHROMIUM_FULL_VERSION.split(".")[0] ?? "143";
}

function generateSecMsGec(): string {
  let ticks = Date.now() / 1000 + WIN_EPOCH_SEC;
  ticks -= ticks % 300;
  const ticks100ns = Math.round(ticks * 10_000_000);
  const strToHash = `${ticks100ns}${TRUSTED_CLIENT_TOKEN}`;
  return createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase();
}

function connectId(): string {
  return randomBytes(16).toString("hex");
}

function edgeHttpDate(): string {
  const d = new Date();
  const wk = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]!;
  const mon = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][d.getUTCMonth()]!;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${wk} ${mon} ${pad(d.getUTCDate())} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
}

function buildWsUrl(): string {
  const base = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;
  return `${base}&ConnectionId=${connectId()}&Sec-MS-GEC=${generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
}

async function synthesizeSpeechMp3Edge(text: string): Promise<Buffer> {
  const voice = "en-US-JennyNeural";
  const lang = "en-US";
  const major = chromiumMajor();
  const muid = randomBytes(16).toString("hex").toUpperCase();

  const url = buildWsUrl();
  const headers: Record<string, string> = {
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
    "Sec-WebSocket-Version": "13",
    "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36 Edg/${major}.0.0.0`,
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-CH-UA": `" Not;A Brand";v="99", "Microsoft Edge";v="${major}", "Chromium";v="${major}"`,
    "Sec-CH-UA-Mobile": "?0",
    Cookie: `muid=${muid};`,
  };

  const name = `knife-tts-${randomBytes(12).toString("hex")}.mp3`;
  const audioPath = join(tmpdir(), name);

  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url, { headers });
    const audioStream = createWriteStream(audioPath);
    const timeoutMs = 45_000;
    const timer = setTimeout(() => {
      ws.close();
      audioStream.destroy();
      reject(new Error("Edge TTS timed out"));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
    };

    ws.on("error", (err) => {
      cleanup();
      audioStream.destroy();
      reject(err);
    });

    ws.on("open", () => {
      const ts = edgeHttpDate();
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: "false",
                    wordBoundaryEnabled: "true",
                  },
                  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
                },
              },
            },
          }),
      );

      const requestId = randomBytes(16).toString("hex");
      const ssml =
        `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}">` +
        `<voice name="${voice}">` +
        `<prosody rate="default" pitch="default" volume="default">` +
        escapeXml(text) +
        `</prosody></voice></speak>`;

      ws.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}Z\r\nPath:ssml\r\n\r\n${ssml}`,
      );
    });

    ws.on("message", (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
      const buf = Buffer.isBuffer(data)
        ? data
        : Buffer.concat(
            Array.isArray(data)
              ? data.map((x) => (Buffer.isBuffer(x) ? x : Buffer.from(x)))
              : [Buffer.from(data as ArrayBuffer)],
          );

      if (isBinary) {
        const sep = Buffer.from("Path:audio\r\n");
        const idx = buf.indexOf(sep);
        if (idx >= 0) {
          audioStream.write(buf.subarray(idx + sep.length));
        }
        return;
      }

      const msg = buf.toString("utf8");
      if (msg.includes("Path:turn.end")) {
        audioStream.end();
        audioStream.on("finish", () => {
          ws.close();
          cleanup();
          resolve();
        });
      }
    });
  });

  try {
    const out = await readFile(audioPath);
    if (out.length < 64) {
      throw new Error("Edge TTS returned empty audio");
    }
    return out;
  } finally {
    await unlink(audioPath).catch(() => {});
  }
}

function googleTtsChunk(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const u = new URL("https://translate.google.com/translate_tts");
    u.searchParams.set("ie", "UTF-8");
    u.searchParams.set("client", "gtx");
    u.searchParams.set("tl", "en");
    u.searchParams.set("q", text);

    https
      .get(
        u.toString(),
        {
          headers: { "User-Agent": GOOGLE_UA },
        },
        (res) => {
          if (res.statusCode == null || res.statusCode >= 400) {
            reject(new Error(`Google TTS HTTP ${res.statusCode ?? "?"}`));
            res.resume();
            return;
          }
          const parts: Buffer[] = [];
          res.on("data", (c: Buffer) => parts.push(Buffer.from(c)));
          res.on("end", () => resolve(Buffer.concat(parts)));
        },
      )
      .on("error", reject);
  });
}

/** Long lines: Google’s endpoint is length-limited; concatenate MP3 chunks. */
async function synthesizeSpeechMp3Google(text: string): Promise<Buffer> {
  const chunks: string[] = [];
  const t = text.trim();
  for (let i = 0; i < t.length; i += GOOGLE_CHUNK) {
    const part = t.slice(i, i + GOOGLE_CHUNK).trim();
    if (part.length > 0) chunks.push(part);
  }
  if (chunks.length === 0) {
    throw new Error("Nothing to speak");
  }

  const buffers: Buffer[] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 75));
    }
    buffers.push(await googleTtsChunk(chunks[i]!));
  }
  return Buffer.concat(buffers);
}

/**
 * MP3 audio for `text`: tries Edge neural TTS, then Google translate_tts if Microsoft
 * closes the connection (common for server/datacenter IPs).
 */
export async function synthesizeSpeechMp3(text: string): Promise<Buffer> {
  try {
    return await synthesizeSpeechMp3Edge(text);
  } catch (e) {
    console.warn(
      "[tts] Edge TTS unavailable, using Google fallback:",
      e instanceof Error ? e.message : e,
    );
    return synthesizeSpeechMp3Google(text);
  }
}
