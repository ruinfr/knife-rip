import type { Client, Guild } from "discord.js";

export async function resolveGuildByInput(
  client: Client,
  raw: string | undefined,
  fallback: Guild | null,
): Promise<Guild | null> {
  const id = raw?.trim();
  if (!id || !/^\d{17,20}$/.test(id)) return fallback;

  const cached = client.guilds.cache.get(id);
  if (cached) return cached;
  try {
    return await client.guilds.fetch(id);
  } catch {
    return null;
  }
}
