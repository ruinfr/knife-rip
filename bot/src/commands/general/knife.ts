import { resolveCommunityDiscordInviteUrl } from "../../../../lib/community-discord";
import { PREFIX } from "../../config";
import { minimalEmbed } from "../../lib/embeds";
import { getGuildCommandPrefix } from "../../lib/guild-prefix";
import type { KnifeCommand } from "../types";

const SITE = "https://knife.rip";
const COMMANDS = `${SITE}/commands`;
const CHANGELOG = `${SITE}/changelog`;
const PRICING = `${SITE}/pricing`;

const hubInvite = resolveCommunityDiscordInviteUrl();

export const knifeCommand: KnifeCommand = {
  name: "knife",
  aliases: ["about", "knifeinfo"],
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
    const prefix = await getGuildCommandPrefix(message.guildId);
    const prefixLine =
      prefix === PREFIX
        ? `**Prefix:** \`${PREFIX}\` (default) — **\`${PREFIX}prefix\`** to customize in servers`
        : `**Prefix:** \`${prefix}\` in this server (default is \`${PREFIX}\`)`;
    const lines = [
      `**Site:** [knife.rip](${SITE})`,
      `**Commands:** [knife.rip/commands](${COMMANDS})`,
      `**What's new:** [knife.rip/changelog](${CHANGELOG}) — **\`${prefix === PREFIX ? PREFIX : prefix}news\`** for the latest line`,
      `**Pro:** [knife.rip/pricing](${PRICING})`,
      `**Hub:** [knife.rip Discord](${hubInvite}) — join for **Pro/owner role sync** and support`,
      prefixLine,
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
