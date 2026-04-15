import type { Message } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import {
  actionableErrorEmbed,
  errorEmbed,
  minimalEmbed,
  missingPermissionEmbed,
} from "../../lib/embeds";
import { hasGuildPermission } from "../../lib/discord-member-perms";
import type { KnifeCommand } from "../types";

/** Discord server nickname limit */
const MAX_NICK_LEN = 32;

function invokerCanManageNick(message: Message): Promise<boolean> {
  return hasGuildPermission(message, PermissionFlagsBits.ManageNicknames);
}

export const nicknameCommand: KnifeCommand = {
  name: "nickname",
  aliases: ["nick"],
  description:
    "Set or clear Arivix’s nickname in this server (Manage Nicknames + bot needs Change Nickname)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Quick tools and light fun.",
    usage: ".nickname [new name] · leave empty to clear · .nick",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!message.guild) {
      await message.reply({
        embeds: [errorEmbed("Use **.nickname** in a server.")],
      });
      return;
    }

    if (!(await invokerCanManageNick(message))) {
      await message.reply({
        embeds: [
          missingPermissionEmbed("you", "Manage Nicknames"),
        ],
      });
      return;
    }

    const me = message.guild.members.me;
    if (!me) {
      await message.reply({
        embeds: [errorEmbed("Could not load my member in this guild.")],
      });
      return;
    }

    if (!me.permissions.has(PermissionFlagsBits.ChangeNickname)) {
      await message.reply({
        embeds: [missingPermissionEmbed("bot", "Change Nickname")],
      });
      return;
    }

    let text = args.join(" ").trim();
    if (text.length > MAX_NICK_LEN) {
      text = text.slice(0, MAX_NICK_LEN);
    }
    const nextNick = text.length === 0 ? null : text;

    try {
      await me.setNickname(nextNick, `${message.author.tag} — .nickname`);
    } catch {
      await message.reply({
        embeds: [
          actionableErrorEmbed({
            title: "Nickname failed",
            body: "Discord blocked the change — raise Arivix's role (still below the owner), and confirm **Change Nickname** + nickname length.",
            linkPermissionsDoc: true,
          }),
        ],
      });
      return;
    }

    await message.reply({
      embeds: [
        minimalEmbed({
          title: "Nickname",
          description:
            nextNick === null
              ? "Cleared my **server nickname** (back to default)."
              : `Set my nickname to **${nextNick}**.`,
        }),
      ],
    });
  },
};
