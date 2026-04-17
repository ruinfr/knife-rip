import { minimalEmbed } from "../../lib/embeds";
import { resolveTargetUser } from "../../lib/resolve-target-user";
import type { ArivixCommand } from "../types";

export const avatarCommand: ArivixCommand = {
  name: "avatar",
  aliases: ["av"],
  description: "Show a user’s avatar (mention, ID, or yourself)",
  site: {
    categoryId: "core",
    categoryTitle: "Core",
    categoryDescription: "Essential prefix commands.",
    usage: ".avatar [@user | user ID]",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const user = await resolveTargetUser(message, args);
    const url = user.displayAvatarURL({ size: 512, extension: "png" });
    const embed = minimalEmbed({
      title: `Avatar — ${user.username}`,
      description: `**[Open full size](${url})**`,
      imageUrl: url,
    });
    await message.reply({ embeds: [embed] });
  },
};
