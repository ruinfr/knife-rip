import { PermissionFlagsBits } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { sendModLogEmbed, updateCaseReason } from "../../lib/mod-case/service";
import { errorEmbed, minimalEmbed, missingPermissionEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

export const reasonCommand: KnifeCommand = {
  name: "reason",
  aliases: ["modreason", "casereason"],
  description: "Update a case reason — **Manage Messages**",
  site: {
    categoryId: "moderation",
    categoryTitle: "Moderation",
    categoryDescription: "Server staff tools.",
    usage: ".reason `<case #>` `<new reason>`",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    const g = message.guild;
    if (!g) {
      await message.reply({
        embeds: [errorEmbed("Servers only.", { title: "Servers only" })],
      });
      return;
    }
    const mem =
      message.member ??
      (await g.members.fetch(message.author.id).catch(() => null));
    if (!mem?.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await message.reply({
        embeds: [missingPermissionEmbed("you", "Manage Messages")],
      });
      return;
    }

    const n = parseInt(args[0] ?? "", 10);
    const newReason = args.slice(1).join(" ").trim();
    if (!Number.isFinite(n) || !newReason) {
      await message.reply({
        embeds: [errorEmbed("Usage: **.reason** `<case #>` `<new reason>`")],
      });
      return;
    }

    const ok = await updateCaseReason(g.id, n, newReason);
    await message.reply({
      embeds: [
        minimalEmbed({
          title: ok ? "Updated" : "Not found",
          description: ok
            ? `Case **#${n}** reason updated.`
            : `Case **#${n}** not found.`,
        }),
      ],
    });
    if (ok) {
      await sendModLogEmbed(
        message.client,
        g.id,
        new EmbedBuilder()
          .setTitle("Case reason (reason command)")
          .setDescription(
            `**#${n}** by ${message.author.tag}\n**New:** ${newReason.slice(0, 500)}`,
          ),
      );
    }
  },
};
