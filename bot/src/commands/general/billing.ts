import { isDeveloperDiscordId } from "../../../../lib/bot-developers";
import { isKnifePremium } from "../../../../lib/knife-premium";
import { getBotInternalSecret, getSiteApiBase } from "../../config";
import { minimalEmbed } from "../../lib/embeds";
import { isCommandOwnerBypass } from "../../lib/owner-bypass";
import { fetchEntitlementFromSite } from "../../lib/site-client";
import type { KnifeCommand } from "../types";

async function resolveBillingLabel(discordUserId: string): Promise<string> {
  if (await isCommandOwnerBypass(discordUserId)) {
    return isDeveloperDiscordId(discordUserId)
      ? "**Developer** — full Pro + owner tools."
      : "**Bot owner** — full Pro + bypass.";
  }
  if (isKnifePremium(discordUserId)) {
    return "**Knife Pro** on this Discord account (complimentary).";
  }
  if (getBotInternalSecret()) {
    try {
      const e = await fetchEntitlementFromSite(discordUserId);
      if (e.developer) {
        return "**Developer** — full Pro (handout/sync).";
      }
      if (e.owner) {
        return "**Owner handout** — Pro-tier access.";
      }
      if (e.premium) {
        return "**Knife Pro** — active on this Discord account.";
      }
      return "**Free** — upgrade anytime (one-time lifetime).";
    } catch {
      return "*Could not verify status — try again shortly.*";
    }
  }
  return "**Free** (site link not configured on this bot instance).";
}

export const billingCommand: KnifeCommand = {
  name: "billing",
  aliases: ["mysub", "subscription"],
  description:
    "Your Pro status and a short link to manage subscription on the site (sent in DM when possible)",
  site: {
    categoryId: "pro",
    categoryTitle: "Pro",
    categoryDescription: "Knife Pro billing and perks.",
    usage: ".billing",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const origin = getSiteApiBase();
    const manageUrl = `${origin}/manage`;
    const pricingUrl = `${origin}/pricing`;

    const tierLine = await resolveBillingLabel(message.author.id);
    const embed = minimalEmbed({
      title: "Billing & Pro",
      description:
        `**Your plan:** ${tierLine}\n\n` +
        `**Manage subscription** (sign in with Discord if asked):\n` +
        `${manageUrl}\n\n` +
        `**Pricing:** ${pricingUrl}\n\n` +
        `_No secrets here — just links. Prefer DMs so your plan isn’t visible in public channels._`,
    });

    try {
      await message.author.send({ embeds: [embed] });
      await message.reply({
        content:
          "Check your **DMs** for your plan and the **manage** link (`/manage` on the site).",
        allowedMentions: { parse: [] },
      });
    } catch {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: "Billing & Pro",
            description:
              `**Your plan:** ${tierLine}\n\n` +
              `**Manage subscription:**\n${manageUrl}\n\n` +
              `I couldn’t DM you — enable **Messages from server members** in Privacy & Safety for this server if you want this in private next time.`,
          }),
        ],
        allowedMentions: { parse: [] },
      });
    }
  },
};
