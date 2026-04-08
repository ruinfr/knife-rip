import { config as dotenv } from "dotenv";
import { dirname, resolve } from "path";

/**
 * Load env from fixed paths (this file lives in `bot/src/`), not `process.cwd()`.
 * Uses `override: true` so values from `.env` replace any empty preset vars (e.g. shells,
 * dotenvx, or hosting dashboards) — otherwise `RAPIDAPI_KEY=` in the environment can block
 * a real key defined in the file.
 */
function loadEnvFiles() {
  const botDir = dirname(dirname(__filename)); // bot/
  const repoRoot = dirname(botDir);
  dotenv({ path: resolve(repoRoot, ".env"), override: true });
  dotenv({ path: resolve(botDir, ".env"), override: true });
}

loadEnvFiles();

export const PREFIX = "." as const;

/** Must match site `lib/commands.ts` → `COMMAND_CATALOG_VERSION`. */
export const COMMAND_CATALOG_VERSION = 38 as const;

export function getDiscordToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is required (same bot app as the site)");
  }
  return token;
}

/**
 * Base URL for calling the Next.js app (entitlement API). No trailing slash.
 */
export function getSiteApiBase(): string {
  const raw =
    process.env.SITE_API_BASE_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/**
 * OAuth2 URL to add the bot to a guild. Prefer a pre-made invite from env.
 * Uses DISCORD_CLIENT_ID when the public invite URL is unset.
 */
export function getBotInviteUrl(): string | undefined {
  const preset =
    process.env.NEXT_PUBLIC_DISCORD_INVITE_URL?.trim() ||
    process.env.DISCORD_BOT_INVITE_URL?.trim();
  if (preset) return preset;
  const id = process.env.DISCORD_CLIENT_ID?.trim();
  if (!id) return undefined;
  const permissions =
    process.env.DISCORD_BOT_INVITE_PERMISSIONS?.trim() || "285280256";
  return `https://discord.com/api/oauth2/authorize?client_id=${id}&permissions=${permissions}&scope=bot%20applications.commands`;
}

export function getBotInternalSecret(): string | undefined {
  const s = process.env.BOT_INTERNAL_SECRET?.trim();
  return s || undefined;
}

/** RapidAPI key for `.tiktok`. Optional until that command is used. */
export function getRapidApiKey(): string | undefined {
  const k =
    process.env.RAPIDAPI_KEY?.trim() || process.env.RAPIDAPI_API_KEY?.trim();
  return k || undefined;
}

/** Mod log channel for economy admin + large transfers (optional). */
export function getEconomyLogChannelId(): string | undefined {
  const id = process.env.ECONOMY_LOG_CHANNEL_ID?.trim();
  return id && /^\d{17,20}$/.test(id) ? id : undefined;
}

/** Legacy osu!api v1 (get_user) — https://github.com/ppy/osu-api/wiki */
export function getOsuLegacyApiKey(): string | undefined {
  const k =
    process.env.OSU_LEGACY_API_KEY?.trim() || process.env.OSU_API_KEY?.trim();
  return k || undefined;
}

/** OpenWeatherMap current weather — https://openweathermap.org/api */
export function getOpenWeatherApiKey(): string | undefined {
  return process.env.OPENWEATHER_API_KEY?.trim() || undefined;
}

/** Optional: Telegram Bot API for `.telegram` (getChat). */
export function getTelegramBotToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined;
}

/** Optional: Etherscan API key — improves `.transaction` (ETH) and `.gas` reliability. */
export function getEtherscanApiKey(): string | undefined {
  return process.env.ETHERSCAN_API_KEY?.trim() || undefined;
}
