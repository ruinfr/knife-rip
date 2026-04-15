import { randomBytes } from "crypto";
import {
  buildDropEmbed,
  dropActionRows,
  dropByToken,
  pickRandomMember,
} from "../../lib/economy/drop-state";
import { parsePositiveBigInt } from "../../lib/economy/money";
import { errorEmbed } from "../../lib/embeds";
import { isCommandOwnerBypass } from "../../lib/owner-bypass";
import type { KnifeCommand } from "../types";

export const luckydropCommand: KnifeCommand = {
  name: "luckydrop",
  aliases: ["cashdrop", "randdrop", "ownerdrop"],
  description:
    "Bot owner only — random member wins a lump of Arivix Cash (confirm / reroll / cancel)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".luckydrop <amount> · .cashdrop · .ownerdrop",
    tier: "free",
    style: "prefix",
    developerOnly: true,
  },
  async run({ message, args }) {
    if (!(await isCommandOwnerBypass(message.author.id))) {
      await message.reply({
        embeds: [errorEmbed("🔒 **`.luckydrop`** is **bot owner** only.")],
      });
      return;
    }
    const guild = message.guild;
    if (!guild) {
      await message.reply({
        embeds: [errorEmbed("Run this in a **server**.")],
      });
      return;
    }

    const amount = parsePositiveBigInt(args[0] ?? "");
    if (!amount) {
      await message.reply({
        embeds: [
          errorEmbed("Usage: **`.luckydrop`** `amount` — e.g. **`.luckydrop 500`**"),
        ],
      });
      return;
    }

    await guild.members.fetch().catch(() => null);

    const exclude = new Set([message.author.id]);
    const selected = pickRandomMember(guild, exclude);
    if (!selected) {
      await message.reply({
        embeds: [errorEmbed("No eligible members to pick (need humans besides you).")],
      });
      return;
    }

    const token = randomBytes(6).toString("hex");
    dropByToken.set(token, {
      ownerId: message.author.id,
      amount,
      guildId: guild.id,
      selectedUserId: selected,
    });

    const session = dropByToken.get(token)!;
    await message.reply({
      embeds: [buildDropEmbed(session, guild)],
      components: dropActionRows(token),
    });
  },
};
