import { resolveCommunityDiscordInviteUrl } from "../../../../lib/community-discord";
import { PREFIX } from "../../config";
import { minimalEmbed } from "../../lib/embeds";
import { getGuildCommandPrefix } from "../../lib/guild-prefix";
import type { ArivixCommand } from "../types";

const SITE = "https://arivix.org";
const COMMANDS = `${SITE}/commands`;
const CHANGELOG = `${SITE}/changelog`;
const PRICING = `${SITE}/pricing`;

const hubInvite = resolveCommunityDiscordInviteUrl();

export const arivixCommand: ArivixCommand = {
  name: "arivix",
  aliases: ["about"],
  description: "About Arivix — site links, prefix, and gateway latency",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".arivix",
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
      `**Site:** [arivix.org](${SITE})`,
      `**Commands:** [arivix.org/commands](${COMMANDS})`,
      `**What's new:** [arivix.org/changelog](${CHANGELOG}) — **\`${prefix === PREFIX ? PREFIX : prefix}news\`** for the latest line`,
      `**Pro:** [arivix.org/pricing](${PRICING})`,
      `**Hub:** [Arivix Discord](${hubInvite}) — join for **Pro/owner role sync** and support`,
      prefixLine,
      `**Gateway ping:** **${ws}** ms`,
    ];

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Arivix",
          description: lines.join("\n"),
          footerText: `${hubInvite}`,
        }),
      ],
    });
  },
};
