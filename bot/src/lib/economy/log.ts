import { EmbedBuilder, type Client } from "discord.js";
import { getEconomyLogChannelId } from "../../config";

const LOG_COLOR = 0x5865f2;

export async function sendEconomyLog(
  client: Client,
  embed: EmbedBuilder,
): Promise<void> {
  const id = getEconomyLogChannelId();
  if (!id) return;
  try {
    const ch = await client.channels.fetch(id).catch(() => null);
    if (!ch?.isTextBased() || ch.isDMBased()) return;
    await ch.send({
      embeds: [embed.setColor(LOG_COLOR).setTimestamp(new Date())],
    });
  } catch {
    /* ignore */
  }
}

export function economyLogEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description);
}
