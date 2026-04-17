import {
  buildPetMenuEmbed,
  buildPetMenuRows,
  loadPetPage,
  petMenuFooterNote,
} from "../../lib/economy/pet-menu";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { errorEmbed } from "../../lib/embeds";
import type { ArivixCommand } from "../types";

export const petsCommand: ArivixCommand = {
  name: "pets",
  aliases: ["petmenu", "mypets"],
  description: "Arivix Cash pets — button menu (equip / feed)",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage: ".pets · .petmenu · .mypets",
    tier: "free",
    style: "prefix",
  },
  async run({ message }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.pets`** in a **server text channel** (not DMs)."),
        ],
      });
      return;
    }

    const uid = message.author.id;
    const page = 0;
    try {
      const { pets, total } = await loadPetPage(uid, page);
      const footerNote = await petMenuFooterNote(uid);
      await message.reply({
        content: `<@${uid}>`,
        embeds: [
          buildPetMenuEmbed({
            ownerId: uid,
            page,
            total,
            pets,
            footerNote,
          }),
        ],
        components: buildPetMenuRows({ ownerId: uid, page, total, pets }),
        allowedMentions: { users: [uid] },
      });
    } catch {
      await message.reply({
        embeds: [
          errorEmbed(
            "Pets could not be loaded (database or migration issue on the bot host). Ask an admin to run **Prisma migrations** and restart the bot.",
            { title: "Can't load pets" },
          ),
        ],
      });
    }
  },
};
