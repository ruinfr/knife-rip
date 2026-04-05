import { PermissionFlagsBits } from "discord.js";
import { getBotInternalSecret } from "../../config";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { isCommandOwnerBypass } from "../../lib/owner-bypass";
import { fetchPremiumFromSite } from "../../lib/site-client";
import type { KnifeCommand } from "../types";

const MAX_LEN = 2000;
const PRICING_URL = "https://knife.rip/pricing";

function parseChannelSnowflake(raw: string | undefined): string | null {
  if (!raw) return null;
  const mention = raw.match(/^<#(\d{17,20})>$/);
  if (mention) return mention[1];
  if (/^\d{17,20}$/.test(raw)) return raw;
  return null;
}

export const sayCommand: KnifeCommand = {
  name: "say",
  description:
    "Post as the bot in a channel (Knife Pro + Administrator)",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".say #channel your message",
    tier: "pro",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!message.guild || !message.member) {
      await message.reply({
        embeds: [errorEmbed("**.say** only works in a server.")],
      });
      return;
    }

    const ownerBypass = isCommandOwnerBypass(message.author.id);

    if (
      !ownerBypass &&
      !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      await message.reply({
        embeds: [
          errorEmbed(
            "You need **Administrator** permission to use **.say**.",
          ),
        ],
      });
      return;
    }

    if (!ownerBypass) {
      if (!getBotInternalSecret()) {
        await message.reply({
          embeds: [
            errorEmbed(
              "**.say** needs Knife Pro verification, but this bot is not linked to the site (**BOT_INTERNAL_SECRET**).",
            ),
          ],
        });
        return;
      }

      let hasPro = false;
      try {
        hasPro = await fetchPremiumFromSite(message.author.id);
      } catch {
        await message.reply({
          embeds: [
            errorEmbed(
              "Could not verify Knife Pro right now. Try again in a moment.",
            ),
          ],
        });
        return;
      }

      if (!hasPro) {
        await message.reply({
          embeds: [
            errorEmbed(
              "**.say** is **Knife Pro** only. Link the Discord account you use here after purchase.\n\n" +
                `**[Pricing](${PRICING_URL})**`,
            ),
          ],
        });
        return;
      }
    }

    const channelId = parseChannelSnowflake(args[0]);
    const text = args.slice(1).join(" ").trim();

    if (!channelId || !text) {
      await message.reply({
        embeds: [
          errorEmbed(
            "Usage: **.say** `<#channel>` `message…` (or a channel ID)",
          ),
        ],
      });
      return;
    }

    if (text.length > MAX_LEN) {
      await message.reply({
        embeds: [
          errorEmbed(`Message is too long (max **${MAX_LEN}** characters).`),
        ],
      });
      return;
    }

    const ch = await message.guild.channels.fetch(channelId).catch(() => null);

    if (!ch?.isTextBased() || ch.isDMBased()) {
      await message.reply({
        embeds: [
          errorEmbed(
            "That channel was not found or is not a text-based channel in this server.",
          ),
        ],
      });
      return;
    }

    if (!ch.isSendable()) {
      await message.reply({
        embeds: [
          errorEmbed(
            "I cannot send messages there (permissions, forum parent, or archived thread).",
          ),
        ],
      });
      return;
    }

    const me = message.guild.members.me;
    const botPerms = me ? ch.permissionsFor(me) : null;
    if (!botPerms?.has(PermissionFlagsBits.SendMessages)) {
      await message.reply({
        embeds: [
          errorEmbed(
            `I do not have **Send Messages** in ${ch}.`,
          ),
        ],
      });
      return;
    }

    try {
      await ch.send({ content: text });
    } catch {
      await message.reply({
        embeds: [
          errorEmbed(
            "Failed to send the message. Check slow mode, age restrictions, and channel settings.",
          ),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Sent",
          description: `Posted in ${ch}.`,
        }),
      ],
    });
  },
};
