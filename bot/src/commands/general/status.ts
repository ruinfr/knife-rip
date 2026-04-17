import { getSiteApiBase } from "../../config";
import { minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

/**
 * Short copy aligned with `app/status/page.tsx` (static operational message).
 * If the page wording changes, update this string to match.
 */
const STATUS_ONELINER =
  "**All systems operational** — website, sign-in, and billing endpoints are reported up on the status page.";

export const statusCommand: ArivixCommand = {
  name: "status",
  aliases: ["botstatus", "statuspage"],
  description: "Site status one-liner and link to the full status page",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".status · .statuspage · .botstatus",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const origin = getSiteApiBase();
    const statusUrl = `${origin}/status`;
    const host = origin.replace(/^https?:\/\//, "");

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "arivix.org status",
          description:
            `${STATUS_ONELINER}\n\n` +
            `**Details:** [${host}/status](${statusUrl})\n` +
            `Problems? **support@arivix.org**`,
        }),
      ],
    });
  },
};
