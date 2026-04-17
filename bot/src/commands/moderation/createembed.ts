import type { ArivixCommand } from "../types";
import { getSiteApiBase } from "../../config";
import { errorEmbed } from "../../lib/embeds";
import {
  BROADCAST_MAX_INPUT,
  deliverProBroadcast,
  gateProAdminBroadcast,
  parseChannelSnowflake,
} from "../../lib/pro-channel-broadcast";

export const createembedCommand: ArivixCommand = {
  name: "createembed",
  aliases: ["ce", "embedcreate", "sendembed", "postembed", "embedsend"],
  description:
    "Post an embed from a **{embed}$v** script (same as **.say** — build on the site; Arivix Pro + Administrator)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage:
      ".createembed #channel {embed}$v{title: …}{description: …} — https://arivix.org/tools/embed",
    tier: "pro",
    style: "prefix",
  },
  async run({ message, args }) {
    const ok = await gateProAdminBroadcast(message, "**.createembed**");
    if (!ok) return;

    const channelId = parseChannelSnowflake(args[0]);
    const text = args.slice(1).join(" ").trim();

    if (!channelId || !text) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.createembed** `<#channel>` `{embed}$v{title: …}{description: …}`\n" +
              `Open **${getSiteApiBase()}/tools/embed** to generate the script.`,
          ),
        ],
      });
      return;
    }

    if (!/\{embed\}\s*\$v/i.test(text)) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Include a **`{embed}$v`** script (use the **Embed builder** on the Arivix site).",
          ),
        ],
      });
      return;
    }

    if (text.length > BROADCAST_MAX_INPUT) {
      await message.reply({
        embeds: [
          errorEmbed(
            `Payload is too long (max **${BROADCAST_MAX_INPUT.toLocaleString()}** characters).`,
          ),
        ],
      });
      return;
    }

    await deliverProBroadcast({
      message,
      channelId,
      rawPayload: text,
      commandLabel: "**.createembed**",
      successTitle: "Embed sent",
    });
  },
};
