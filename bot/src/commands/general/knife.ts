import { resolveCommunityDiscordInviteUrl } from "../../../../lib/community-discord";
import { minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

const SITE = "https://knife.rip";
const COMMANDS = `${SITE}/commands`;
const PRICING = `${SITE}/pricing`;

const hubInvite = resolveCommunityDiscordInviteUrl();

export const knifeCommand: KnifeCommand = {
  name: "knife",
  description: "About Knife — site links, prefix, and gateway latency",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".knife",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const ws = message.client.ws.ping;
    const lines = [
      `**Site:** [knife.rip](${SITE})`,
      `**Commands:** [knife.rip/commands](${COMMANDS})`,
      `**Pro:** [knife.rip/pricing](${PRICING})`,
      `**Hub:** [knife.rip Discord](${hubInvite}) — join for **Pro/owner role sync** and support`,
      `**Prefix:** \`.\` (dot)`,
      `**Gateway ping:** **${ws}** ms`,
    ];

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Knife",
          description: lines.join("\n"),
          footerText: `${hubInvite}`,
        }),
      ],
    });
  },
};
