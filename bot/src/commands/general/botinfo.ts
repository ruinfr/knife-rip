import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { resolveCommunityDiscordInviteUrl } from "../../../../lib/community-discord";
import { COMMAND_CATALOG_VERSION, getSiteApiBase } from "../../config";
import { minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

function readBotPackageVersion(): string {
  try {
    const pkgPath = join(dirname(__filename), "..", "..", "..", "package.json");
    const raw = readFileSync(pkgPath, "utf8");
    const j = JSON.parse(raw) as { version?: string };
    return j.version?.trim() || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export const botinfoCommand: KnifeCommand = {
  name: "botinfo",
  aliases: ["bi"],
  description:
    "Bot version, support server, website, and legal links (privacy & terms)",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".botinfo · .bi",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const origin = getSiteApiBase();
    const host = origin.replace(/^https?:\/\//, "");
    const hub = resolveCommunityDiscordInviteUrl();
    const pkgVer = readBotPackageVersion();
    const ws = message.client.ws.ping;

    const lines = [
      `**Bot version:** \`${pkgVer}\` · command sync **v${COMMAND_CATALOG_VERSION}**`,
      `**Support (hub):** [Discord](${hub})`,
      `**Website:** [${host}](${origin})`,
      `**Commands:** [Command list](${origin}/commands)`,
      `**Privacy:** [Privacy policy](${origin}/privacy)`,
      `**Terms:** [Terms of service](${origin}/terms)`,
      `**Prefix:** \`.\` · **Gateway:** **${ws}** ms`,
    ];

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Arivix — bot info",
          description: lines.join("\n"),
          footerText: hub,
        }),
      ],
    });
  },
};
