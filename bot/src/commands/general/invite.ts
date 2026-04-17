import { getBotInviteUrl, getSiteApiBase } from "../../config";
import { minimalEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

export const inviteCommand: ArivixCommand = {
  name: "invite",
  aliases: ["inv"],
  description: "Add Arivix to your server and open the web dashboard to manage it",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".invite · .inv",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    const origin = getSiteApiBase();
    const dashboardUrl = `${origin}/dashboard`;
    const invite = getBotInviteUrl();

    const inviteLine = invite
      ? `**[Add Arivix to a server](${invite})**`
      : `_Bot invite URL isn’t set. Ask the host to set **NEXT_PUBLIC_DISCORD_INVITE_URL** or **DISCORD_CLIENT_ID**._`;

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Invite & dashboard",
          description:
            `${inviteLine}\n\n` +
            `**Manage on the web** (sign in with Discord):\n` +
            `${dashboardUrl}`,
        }),
      ],
    });
  },
};
