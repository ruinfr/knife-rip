import type { Client, Guild } from "discord.js";
import { getEconomyLogChannelId } from "../../config";

export async function resolveHubGuild(client: Client): Promise<Guild | null> {
  const id = getEconomyLogChannelId();
  if (!id) return null;
  const ch = await client.channels.fetch(id).catch(() => null);
  if (!ch?.isTextBased() || ch.isDMBased()) return null;
  return ch.guild;
}
