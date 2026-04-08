import type { KnifeCommand } from "../types";
import { errorEmbed } from "../../lib/embeds";
import {
  BROADCAST_MAX_INPUT,
  deliverProBroadcast,
  gateProAdminBroadcast,
  parseChannelSnowflake,
} from "../../lib/pro-channel-broadcast";

export const sayCommand: KnifeCommand = {
  name: "say",
  aliases: ["botsay", "botpost"],
  description:
    "Post as the bot in a channel — text or Knife **{embed}$v** script from the site builder (Knife Pro + Administrator; owners skip both)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage:
      ".say #channel hello · .say #channel {embed}$v{title: Hi}{description: {guild.name}}",
    tier: "pro",
    style: "prefix",
  },
  async run({ message, args }) {
    const ok = await gateProAdminBroadcast(message, "**.say**");
    if (!ok) return;

    const channelId = parseChannelSnowflake(args[0]);
    const text = args.slice(1).join(" ").trim();

    if (!channelId || !text) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.say** `<#channel>` `message…` — optional **`{embed}$v{title: …}`** script (see **knife.rip/tools/embed**)",
          ),
        ],
      });
      return;
    }

    if (text.length > BROADCAST_MAX_INPUT) {
      await message.reply({
        embeds: [
          errorEmbed(
            `Message is too long (max **${BROADCAST_MAX_INPUT.toLocaleString()}** characters).`,
          ),
        ],
      });
      return;
    }

    await deliverProBroadcast({
      message,
      channelId,
      rawPayload: text,
      commandLabel: "**.say**",
    });
  },
};
