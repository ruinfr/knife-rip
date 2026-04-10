import { ecoM } from "../../lib/economy/custom-emojis";
import {
  GAMBLE_MULT_MAX,
  PET_BUYABLE_SPECIES,
  PET_FEED_HAPPY_MAX,
  PET_FEED_HAPPY_MIN,
  PET_FEED_TREASURY_PCT,
  PET_FEED_XP,
  PET_GAMBLE_BONUS_MAX,
  PET_GAMBLE_BONUS_PER_STEP,
  PET_GAMBLE_BONUS_XP_STEP,
  PET_GAMBLE_COMBINED_MAX,
  PET_HAPPY_GAMBLE_EXTRA,
  PET_HAPPY_GAMBLE_THRESHOLD,
  PET_MAX_HAPPINESS,
  PET_SPECIES,
} from "../../lib/economy/economy-tuning";
import {
  computeEquippedPetGambleBonus,
  describePetHappinessBonusLine,
  describePetXpBonusProgress,
} from "../../lib/economy/payout-multiplier";
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
    "Buy, equip, feed, or inspect Knife Cash pets — **`.pet buy`** · **`.pet equip`** · **`.pet feed`** · **`.pet info`**",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Knife Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage:
      ".pet buy <dog|cat|rabbit> · .pet equip <species> · .pet feed · .pet info",
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
              `**info** — \`.pet info\` (XP + happiness → small **.gamble** payout bonus)\n` +
              `Use **\`.pets\`** for the button menu.`,
          }),
        ],
      });
      return;
    }

    if (sub === "info") {
      const pet = await prisma.economyPet.findFirst({
        where: { ownerId: uid, equipped: true },
      });
      const intro = [
        "**Equipped pet** adds a modest bonus on **.gamble** house games (coinflip, blackjack, roulette picks, mines). It **stacks with** Nitro/Pro boost, then the total multiplier is **capped**.",
        "",
        `**XP:** **+${(PET_GAMBLE_BONUS_PER_STEP * 100).toFixed(0)}%** per **${PET_GAMBLE_BONUS_XP_STEP.toLocaleString()}** XP (up to **+${(PET_GAMBLE_BONUS_MAX * 100).toFixed(0)}%** from XP).`,
        `**Happiness:** **+${(PET_HAPPY_GAMBLE_EXTRA * 100).toFixed(1)}%** when ❤️ ≥ **${PET_HAPPY_GAMBLE_THRESHOLD}**.`,
        `**Pet total cap:** **+${(PET_GAMBLE_COMBINED_MAX * 100).toFixed(1)}%** from the pet · **overall** payout mult cap **${GAMBLE_MULT_MAX}×** (boost + pet).`,
        "",
      ];
      if (!pet) {
        intro.push(
          "You **don’t** have an equipped pet. Buy with **`.pet buy`** and equip with **`.pet equip`** or **`.pets`**.",
        );
      } else {
        const spec = PET_SPECIES[pet.speciesKey];
        const label = spec?.label ?? pet.speciesKey;
        const { total, xpPart, happyPart } = computeEquippedPetGambleBonus(
          pet.xp,
          pet.happiness,
        );
        intro.push(
          `**Equipped:** **${label}** · XP **${pet.xp.toLocaleString()}** · ❤️ **${pet.happiness}**`,
          "",
          `**Your pet bonus now:** **+${(total * 100).toFixed(1)}%** on wins that use this multiplier (**+${(xpPart * 100).toFixed(1)}%** from XP · **+${(happyPart * 100).toFixed(1)}%** from happiness).`,
          describePetXpBonusProgress(pet.xp),
          describePetHappinessBonusLine(pet.happiness),
        );
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.cash} Pet bonuses (.gamble)`,
            description: intro.join("\n"),
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
            description:
              `Your **${species}** is now equipped — small **.gamble** payout bonus while it stays equipped.\n` +
              `See **\`.pet info\`** for XP and happiness breakdown.`,
          }),
        ],
      });
      return;
    }

    if (sub === "feed") {
      try {
        const fed = await prisma.$transaction(async (tx) => {
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
          const newHappy = Math.min(
            PET_MAX_HAPPINESS,
            pet.happiness + happyGain,
          );
          const newXp = pet.xp + PET_FEED_XP;
          await tx.economyPet.update({
            where: { id: pet.id },
            data: {
              xp: newXp,
              happiness: newHappy,
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
          const label = spec.label;
          return {
            label,
            prevXp: pet.xp,
            prevHappy: pet.happiness,
            xp: newXp,
            happiness: newHappy,
          };
        });
        const { total } = computeEquippedPetGambleBonus(fed.xp, fed.happiness);
        await message.reply({
          embeds: [
            minimalEmbed({
              title: `${ecoM.cash} Pet fed`,
              description:
                `Your **${fed.label}** · XP **${fed.prevXp.toLocaleString()} → ${fed.xp.toLocaleString()}** (+${PET_FEED_XP}) · ❤️ **${fed.prevHappy} → ${fed.happiness}**.\n` +
                `Equipped pet **.gamble** bonus is now **~+${(total * 100).toFixed(1)}%** (see **\`.pet info\`**).`,
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
          "Unknown subcommand. Try **`.pet buy`**, **`.pet equip`**, **`.pet feed`**, or **`.pet info`**.",
        ),
      ],
    });
  },
};
