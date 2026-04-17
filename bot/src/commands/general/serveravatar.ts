import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import type { ArivixCommand } from "../types";

export const serveravatarCommand: ArivixCommand = {
  name: "serveravatar",
  aliases: ["savatar", "guildavatar", "gavatar"],
  description:
    "Member avatar as shown in this server (guild avatar if set, else global)",
  site: {
    categoryId: "utility",
    categoryTitle: "Utility",
    categoryDescription: "Profile assets.",
    usage: ".serveravatar [@user | ID]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [
          errorEmbed("Use **.serveravatar** inside a server for guild avatars."),
        ],
      });
      return;
    }

    const user = await resolveTargetUser(message, args);
    const member = await guild.members.fetch(user.id).catch(() => null);
    const url =
      member?.displayAvatarURL({
        size: 512,
        extension: "png",
        forceStatic: false,
      }) ?? user.displayAvatarURL({ size: 512, extension: "png" });

    await message.reply({
      embeds: [
        minimalEmbed({
          title: `Server avatar — ${user.username}`,
          description: `**[Open full size](${url})**`,
          imageUrl: url,
        }),
      ],
    });
  },
};
