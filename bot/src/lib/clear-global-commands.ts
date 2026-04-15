import { REST, Routes } from "discord.js";
import { getDiscordToken } from "../config";

function applicationIdFromBotToken(token: string): string | null {
  const part = token.split(".")[0];
  if (!part) return null;
  try {
    const id = Buffer.from(part, "base64").toString("utf8");
    return /^\d{17,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Overwrites global slash commands with none — removes stale entries (e.g. retired /vanities)
 * after Arivix moved to prefix-only for that feature.
 */
export async function clearGlobalApplicationCommands(): Promise<void> {
  let appId = process.env.DISCORD_CLIENT_ID?.trim() ?? null;
  if (!appId || !/^\d{17,20}$/.test(appId)) {
    appId = applicationIdFromBotToken(getDiscordToken());
  }
  if (!appId) {
    console.warn(
      "Global slash cleanup skipped — set DISCORD_CLIENT_ID or use a valid bot token.",
    );
    return;
  }

  const rest = new REST({ version: "10" }).setToken(getDiscordToken());
  try {
    await rest.put(Routes.applicationCommands(appId), { body: [] });
    console.log("Global slash commands cleared (Arivix is prefix-first).");
  } catch (e) {
    console.warn("Global slash command cleanup failed:", e);
  }
}
