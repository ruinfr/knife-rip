import { ecoM } from "../../lib/economy/custom-emojis";
import {
  PET_BUYABLE_SPECIES,
  PET_FEED_HAPPY_MAX,
  PET_FEED_HAPPY_MIN,
  PET_FEED_TREASURY_PCT,
  PET_FEED_XP,
  PET_MAX_HAPPINESS,
  PET_SPECIES,
} from "../../lib/economy/economy-tuning";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { formatCash } from "../../lib/economy/money";
import {
  creditTreasuryInTx,
  type LedgerReason,
} from "../../lib/economy/wallet";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

const BUYABLE_HINT = PET_BUYABLE_SPECIES.join("|");

export const petCommand: KnifeCommand = {
  name: "pet",
  description:
    "Buy, equip, or feed Knife Cash pets — **`.pet buy <species>`** · **`.pet equip`** · **`.pet feed`**",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Knife Cash (global wallet), shop, house games, and transfers — virtual currency for fun.",
    usage: ".pet buy <dog|cat|rabbit> · .pet equip <species> · .pet feed",
    tier: "free",
    style: "prefix",
  },
  async run({ message, args }) {
    if (!isGuildTextEconomyChannel(message)) {
      await message.reply({
        embeds: [
          errorEmbed("Run **`.pet`** in a **server text channel** (not DMs)."),
        ],
      });
      return;
    }

    const uid = message.author.id;
    const prisma = getBotPrisma();
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === "help") {
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.cash} Pet commands`,
            description:
              `**buy** — \`.pet buy <${BUYABLE_HINT}>\`\n` +
              `**equip** — \`.pet equip <species>\` (your newest of that species)\n` +
              `**feed** — \`.pet feed\` (feeds your **equipped** pet)\n` +
              `Use **\`.pets\`** for the button menu.`,
          }),
        ],
      });
      return;
    }

    if (sub === "buy") {
      const species = args[1]?.toLowerCase();
      const buyable =
        species &&
        (PET_BUYABLE_SPECIES as readonly string[]).includes(species);
      if (!buyable) {
        await message.reply({
          embeds: [
            errorEmbed(
              `Pick a species: **${PET_BUYABLE_SPECIES.join("**, **")}**.`,
            ),
          ],
        });
        return;
      }
      const { price } = PET_SPECIES[species]!;
      try {
        const row = await prisma.$transaction(async (tx) => {
          const u = await tx.economyUser.upsert({
            where: { discordUserId: uid },
            create: { discordUserId: uid },
            update: {},
          });
          if (u.cash < price) throw new Error("POOR");
          const cashAfter = u.cash - price;
          await tx.economyUser.update({
            where: { discordUserId: uid },
            data: { cash: cashAfter },
          });
          await tx.economyLedger.create({
            data: {
              discordUserId: uid,
              delta: -price,
              balanceAfter: cashAfter,
              reason: "pet" satisfies LedgerReason,
              meta: { op: "buy", species },
            },
          });
          await tx.economyPet.create({
            data: {
              ownerId: uid,
              speciesKey: species,
            },
          });
          return cashAfter;
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: `${ecoM.cash} Pet adopted`,
              description:
                `You bought a **${species}** for **${formatCash(price)}**.\n` +
                `Balance: **${formatCash(row)}** · Use **\`.pets\`** to equip or feed.`,
            }),
          ],
        });
      } catch (e) {
        if (e instanceof Error && e.message === "POOR") {
          await message.reply({
            embeds: [errorEmbed("You can't afford that pet.")],
          });
          return;
        }
        throw e;
      }
      return;
    }

    if (sub === "equip") {
      const species = args[1]?.toLowerCase();
      if (!species || !PET_SPECIES[species]) {
        await message.reply({
          embeds: [
            errorEmbed(
              `Usage: **\`.pet equip <species>\`** — you must own that pet type.`,
            ),
          ],
        });
        return;
      }
      try {
        await prisma.$transaction(async (tx) => {
          const pet = await tx.economyPet.findFirst({
            where: { ownerId: uid, speciesKey: species },
            orderBy: { createdAt: "desc" },
          });
          if (!pet) throw new Error("NONE");
          await tx.economyPet.updateMany({
            where: { ownerId: uid },
            data: { equipped: false },
          });
          await tx.economyPet.update({
            where: { id: pet.id },
            data: { equipped: true },
          });
        });
      } catch (e) {
        if (e instanceof Error && e.message === "NONE") {
          await message.reply({
            embeds: [errorEmbed("You don't own that species.")],
          });
          return;
        }
        throw e;
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.cash} Pet equipped`,
            description: `Your **${species}** is now equipped (gamble payout bonus when applicable).`,
          }),
        ],
      });
      return;
    }

    if (sub === "feed") {
      try {
        await prisma.$transaction(async (tx) => {
          const pet = await tx.economyPet.findFirst({
            where: { ownerId: uid, equipped: true },
          });
          if (!pet) throw new Error("NONE");
          const spec = PET_SPECIES[pet.speciesKey];
          if (!spec) throw new Error("BAD");
          const u = await tx.economyUser.findUnique({
            where: { discordUserId: uid },
          });
          if (!u || u.cash < spec.feedCost) throw new Error("POOR");
          const cashAfter = u.cash - spec.feedCost;
          await tx.economyUser.update({
            where: { discordUserId: uid },
            data: { cash: cashAfter },
          });
          const happyGain =
            PET_FEED_HAPPY_MIN +
            Math.floor(
              Math.random() * (PET_FEED_HAPPY_MAX - PET_FEED_HAPPY_MIN + 1),
            );
          await tx.economyPet.update({
            where: { id: pet.id },
            data: {
              xp: pet.xp + PET_FEED_XP,
              happiness: Math.min(
                PET_MAX_HAPPINESS,
                pet.happiness + happyGain,
              ),
            },
          });
          await tx.economyLedger.create({
            data: {
              discordUserId: uid,
              delta: -spec.feedCost,
              balanceAfter: cashAfter,
              reason: "pet" satisfies LedgerReason,
              meta: { op: "feed_cmd", petId: pet.id },
            },
          });
          const toTreasury =
            (spec.feedCost * BigInt(PET_FEED_TREASURY_PCT) + 99n) / 100n;
          if (toTreasury > 0n) {
            await creditTreasuryInTx(tx, {
              delta: toTreasury,
              reason: "treasury_fee",
              meta: { kind: "pet_feed_cmd", userId: uid },
              actorUserId: uid,
            });
          }
        });
        await message.reply({
          embeds: [
            minimalEmbed({
              title: `${ecoM.cash} Pet fed`,
              description: "Your equipped pet gained **XP** and **happiness**.",
            }),
          ],
        });
      } catch (e) {
        if (e instanceof Error) {
          if (e.message === "NONE") {
            await message.reply({
              embeds: [
                errorEmbed("Equip a pet first (**`.pet equip <species>`** or **`.pets`**)."),
              ],
            });
            return;
          }
          if (e.message === "POOR") {
            await message.reply({
              embeds: [errorEmbed("Not enough cash to feed.")],
            });
            return;
          }
        }
        throw e;
      }
      return;
    }

    await message.reply({
      embeds: [
        errorEmbed(
          "Unknown subcommand. Try **`.pet buy`**, **`.pet equip`**, or **`.pet feed`**.",
        ),
      ],
    });
  },
};
