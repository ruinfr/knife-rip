import { PermissionFlagsBits, type Message } from "discord.js";
import { isKnifePremium } from "../../../lib/knife-premium";
import { getBotInternalSecret, getSiteApiBase } from "../config";
import { errorEmbed, minimalEmbed } from "./embeds";
import { resolveChannelMessagePayload } from "./knife-message-payload";
import { isCommandOwnerBypass } from "./owner-bypass";
import { fetchPremiumFromSite } from "./site-client";

const PRICING_URL = "https://arivix.org/pricing";
/** Allow long scripts (embed + pairs); individual parts are capped in resolver. */
export const BROADCAST_MAX_INPUT = 12_000;

export function parseChannelSnowflake(raw: string | undefined): string | null {
  if (!raw) return null;
  const mention = raw.match(/^<#(\d{17,20})>$/);
  if (mention) return mention[1]!;
  if (/^\d{17,20}$/.test(raw)) return raw;
  return null;
}

export async function gateProAdminBroadcast(
  message: Message,
  label: string,
): Promise<boolean> {
  if (!message.guild) {
    await message.reply({
      embeds: [errorEmbed(`${label} only works in a server.`)],
    });
    return false;
  }

  const ownerBypass = await isCommandOwnerBypass(message.author.id);

  const member =
    message.member ??
    (await message.guild.members.fetch(message.author.id).catch(() => null));

  if (
    !ownerBypass &&
    (!member || !member.permissions.has(PermissionFlagsBits.Administrator))
  ) {
    await message.reply({
      embeds: [
        errorEmbed(
          `You need **Administrator** permission to use ${label}.`,
        ),
      ],
    });
    return false;
  }

  if (!ownerBypass) {
    const listedPremium = isKnifePremium(message.author.id);

    if (!listedPremium && !getBotInternalSecret()) {
      await message.reply({
        embeds: [
          errorEmbed(
            `${label} needs Arivix Pro verification, but this bot is not linked to the site (**BOT_INTERNAL_SECRET**).`,
          ),
        ],
      });
      return false;
    }

    let hasPro = listedPremium;
    if (!hasPro) {
      try {
        hasPro = await fetchPremiumFromSite(message.author.id);
      } catch {
        await message.reply({
          embeds: [
            errorEmbed(
              "Could not verify Arivix Pro right now. Try again in a moment.",
            ),
          ],
        });
        return false;
      }
    }

    if (!hasPro) {
      await message.reply({
        embeds: [
          errorEmbed(
            `${label} is **Arivix Pro** only. Link the Discord account you use here after purchase.\n\n**[Pricing](${PRICING_URL})**`,
          ),
        ],
      });
      return false;
    }
  }

  return true;
}

export async function deliverProBroadcast(options: {
  message: Message;
  channelId: string;
  rawPayload: string;
  /** e.g. ".say" or ".createembed" */
  commandLabel: string;
  successTitle?: string;
}): Promise<void> {
  const { message, channelId, rawPayload, commandLabel, successTitle } =
    options;
  const guild = message.guild!;

  if (rawPayload.length > BROADCAST_MAX_INPUT) {
    await message.reply({
      embeds: [
        errorEmbed(
          `Payload is too long (max **${BROADCAST_MAX_INPUT.toLocaleString()}** characters).`,
        ),
      ],
    });
    return;
  }

  const ch = await guild.channels.fetch(channelId).catch(() => null);

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

  const me = guild.members.me;
  const botPerms = me ? ch.permissionsFor(me) : null;
  if (!botPerms?.has(PermissionFlagsBits.SendMessages)) {
    await message.reply({
      embeds: [errorEmbed(`I do not have **Send Messages** in ${ch}.`)],
    });
    return;
  }

  const embedAllowed =
    botPerms.has(PermissionFlagsBits.EmbedLinks) ||
    botPerms.has(PermissionFlagsBits.Administrator);

  const resolved = resolveChannelMessagePayload(message, rawPayload);
  if (!resolved.ok) {
    await message.reply({
      embeds: [
        errorEmbed(
          `${commandLabel} — ${resolved.error}\nBuild scripts on **${getSiteApiBase()}/tools/embed**.`,
        ),
      ],
    });
    return;
  }

  if (resolved.embeds?.length && !embedAllowed) {
    await message.reply({
      embeds: [
        errorEmbed(
          `I need **Embed Links** in ${ch} to post that ${commandLabel} payload.`,
        ),
      ],
    });
    return;
  }

  try {
    await ch.send({
      content: resolved.content,
      embeds: resolved.embeds,
    });
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
        title: successTitle ?? "Sent",
        description: `Posted in ${ch}.${resolved.warnings.length ? `\n_${resolved.warnings.join(" · ")}_` : ""}`,
      }),
    ],
  });
}
