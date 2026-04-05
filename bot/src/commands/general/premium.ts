import { isDeveloperDiscordId } from "../../../../lib/bot-developers";
import { isKnifePremium } from "../../../../lib/knife-premium";
import { getBotInternalSecret } from "../../config";
import { minimalEmbed } from "../../lib/embeds";
import { isCommandOwnerBypass } from "../../lib/owner-bypass";
import { fetchPremiumFromSite } from "../../lib/site-client";
import type { KnifeCommand } from "../types";

const PRICING_URL = "https://knife.rip/pricing";

export const premiumCommand: KnifeCommand = {
  name: "premium",
  aliases: ["pro", "prem"],
  description: "Knife Pro — one-time lifetime unlock and your status",
  site: {
    categoryId: "pro",
    categoryTitle: "Pro",
    categoryDescription: "Knife Pro billing and perks.",
    usage: ".premium",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    let status = "";
    if (await isCommandOwnerBypass(message.author.id)) {
      status = isDeveloperDiscordId(message.author.id)
        ? "\n\n**Your status:** You are a **Developer** (full Knife Pro + owner handouts + command bypass)."
        : "\n\n**Your status:** You are a **bot owner** (full Knife Pro + command bypass).";
    } else if (isKnifePremium(message.author.id)) {
      status =
        "\n\n**Your status:** You have **Knife Pro** on this Discord account (complimentary).";
    } else if (getBotInternalSecret()) {
      try {
        const hasPro = await fetchPremiumFromSite(message.author.id);
        status = hasPro
          ? "\n\n**Your status:** You have **Knife Pro** on this Discord account."
          : "\n\n**Your status:** No Pro on this account yet — grab it on the site.";
      } catch {
        status = "\n\n*Could not verify Pro status right now.*";
      }
    }

    const embed = minimalEmbed({
      title: "Knife Pro",
      description:
        `**Knife Pro** is a **one-time $10** lifetime unlock — no monthly fee.\n\n` +
        `Unlock Pro features and support development.\n\n` +
        `**[Pricing & checkout](${PRICING_URL})**` +
        status,
    });
    await message.reply({ embeds: [embed] });
  },
};
