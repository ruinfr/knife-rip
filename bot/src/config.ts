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
export const COMMAND_CATALOG_VERSION = 3 as const;

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
