import {
  GAMBLE_MULT_MAX,
  PET_BUYABLE_SPECIES,
  PET_FEED_TREASURY_PCT,
  PET_GAMBLE_BONUS_MAX,
  PET_GAMBLE_BONUS_PER_STEP,
  PET_GAMBLE_BONUS_XP_STEP,
  PET_GAMBLE_COMBINED_MAX,
  PET_HAPPY_GAMBLE_EXTRA,
  PET_HAPPY_GAMBLE_THRESHOLD,
  PET_MAX_HAPPINESS,
  PET_REBIRTH_EXCLUSIVE_MIN,
  PET_SPECIES,
  petFeedXpFor,
  petGambleTuningFor,
  rollPetFeedHappyGain,
} from "../../lib/economy/economy-tuning";
import { petFeedXpMultBps } from "../../lib/economy/rebirth-mult";
import {
  computeEquippedPetGambleBonus,
  describePetHappinessBonusLine,
  describePetXpBonusProgress,
} from "../../lib/economy/payout-multiplier";
import { ecoM, petSpeciesEmoji } from "../../lib/economy/custom-emojis";
import { isGuildTextEconomyChannel } from "../../lib/economy/guild-economy-context";
import { formatCash } from "../../lib/economy/money";
import {
  creditTreasuryInTx,
  type LedgerReason,
} from "../../lib/economy/wallet";
import { formatPetCallName } from "../../lib/economy/pet-menu";
import { getBotPrisma } from "../../lib/db-prisma";
import { errorEmbed, minimalEmbed } from "../../lib/embeds";
import type { KnifeCommand } from "../types";

const BUYABLE_HINT = PET_BUYABLE_SPECIES.join("|");
const PET_NICKNAME_MAX_LEN = 32;

function sanitizePetNickname(raw: string): string | null {
  const s = raw
    .replace(/[\r\n\t]/g, " ")
    .replace(/<@!?[0-9]{17,20}>/g, "")
    .trim()
    .slice(0, PET_NICKNAME_MAX_LEN)
    .trim();
  return s.length > 0 ? s : null;
}

function petShopCatalogLines(): string {
  return PET_BUYABLE_SPECIES.map((s) => {
    const sp = PET_SPECIES[s]!;
    return `${petSpeciesEmoji(s)} **${sp.label}** — **${formatCash(sp.price)}** · feed **${formatCash(sp.feedCost)}**`;
  }).join("\n");
}

export const petCommand: KnifeCommand = {
  name: "pet",
  aliases: ["adopt", "mypet"],
  description:
    "Buy, equip, feed, or inspect Arivix Cash pets — **`.pet buy`** · **`.pet equip`** · **`.pet feed`** · **`.pet info`**",
  site: {
    categoryId: "gambling",
    categoryTitle: "Gambling & economy",
    categoryDescription:
      "Global Arivix Cash — .gamble hub, shop, daily, work/crime/beg, bank & businesses, gathering (.mine / .fish), pets, pay, and guild .rob / .duel / .bounty. Virtual currency for fun.",
    usage:
      ".pet buy <dog|cat|rabbit> · .adopt · .pet equip <species> · .pet feed · .pet name <name|clear> · .pet info",
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
            title: `${ecoM.petfood} Pet commands`,
            description:
              `**buy** — \`.pet buy <${BUYABLE_HINT}>\`\n` +
              `**equip** — \`.pet equip <species>\` (your newest of that species)\n` +
              `**feed** — \`.pet feed\` (feeds your **equipped** pet)\n` +
              `**name** — \`.pet name <name>\` or \`.pet name clear\` (equipped pet only, max **${PET_NICKNAME_MAX_LEN}** chars)\n` +
              `**info** — \`.pet info\` (XP + happiness → small **.gamble** payout bonus)\n` +
              `Use **\`.pets\`** for the button menu.\n\n` +
              `**Adoption & feed**\n${petShopCatalogLines()}\n` +
              `${petSpeciesEmoji("phoenix")} **Ash phoenix** — **${formatCash(PET_SPECIES.phoenix!.price)}** · requires **${PET_REBIRTH_EXCLUSIVE_MIN}+** rebirths (**\`.pet buy phoenix\`**)`,
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
        `**Pet bonus cap:** up to **+${(PET_GAMBLE_COMBINED_MAX * 100).toFixed(1)}%** (Dog) — **Cat** & **Rabbit** get a bit more XP & ❤️ per feed plus a slightly **higher cap** & tiny flat bonus.`,
        `**Overall** payout mult cap **${GAMBLE_MULT_MAX}×** (boost + pet).`,
        "",
      ];
      if (!pet) {
        intro.push(
          "You **don’t** have an equipped pet. Buy with **`.pet buy`** and equip with **`.pet equip`** or **`.pets`**.",
        );
      } else {
        const call = formatPetCallName(pet);
        const { total, xpPart, happyPart } = computeEquippedPetGambleBonus(
          pet.xp,
          pet.happiness,
          pet.speciesKey,
        );
        const capPct = (
          petGambleTuningFor(pet.speciesKey).cap * 100
        ).toFixed(1);
        intro.push(
          `**Equipped:** ${petSpeciesEmoji(pet.speciesKey)} **${call}** · ${ecoM.xp} **${pet.xp.toLocaleString()}** · ❤️ **${pet.happiness}**`,
          "",
          `**Your pet bonus now:** **+${(total * 100).toFixed(1)}%** on wins (**+${(xpPart * 100).toFixed(1)}%** from XP · **+${(happyPart * 100).toFixed(1)}%** beyond XP). **Breed cap:** **${capPct}%**.`,
          describePetXpBonusProgress(pet.xp),
          describePetHappinessBonusLine(pet.happiness),
        );
      }
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.petfood} Pet bonuses (.gamble)`,
            description: intro.join("\n"),
          }),
        ],
      });
      return;
    }

    if (sub === "name" || sub === "rename") {
      const rest = args.slice(1).join(" ").trim();
      if (!rest) {
        await message.reply({
          embeds: [
            errorEmbed(
              `Usage: **\`.pet name <name>\`** — names your **equipped** pet (max **${PET_NICKNAME_MAX_LEN}** chars). **\`.pet name clear\`** removes the name.`,
            ),
          ],
        });
        return;
      }
      const clear = rest.toLowerCase() === "clear";
      const nickname = clear ? null : sanitizePetNickname(rest);
      if (!clear && !nickname) {
        await message.reply({
          embeds: [
            errorEmbed(
              `That name is empty or invalid. Use letters/numbers/spaces — max **${PET_NICKNAME_MAX_LEN}** chars (no pings).`,
            ),
          ],
        });
        return;
      }
      const equipped = await prisma.economyPet.findFirst({
        where: { ownerId: uid, equipped: true },
      });
      if (!equipped) {
        await message.reply({
          embeds: [
            errorEmbed(
              "Equip a pet first (**`.pet equip <species>`** or **`.pets`**).",
            ),
          ],
        });
        return;
      }
      await prisma.economyPet.update({
        where: { id: equipped.id },
        data: { nickname },
      });
      const call = formatPetCallName({
        nickname,
        speciesKey: equipped.speciesKey,
      });
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.petfood} Pet name`,
            description: clear
              ? `Cleared the name for **${call}**.`
              : `Your equipped pet is now **${call}**.`,
          }),
        ],
      });
      return;
    }

    if (sub === "buy") {
      const species = args[1]?.toLowerCase();
      const buyable =
        species &&
        ((PET_BUYABLE_SPECIES as readonly string[]).includes(species) ||
          species === "phoenix");
      if (!buyable) {
        await message.reply({
          embeds: [
            errorEmbed(
              `Pick a species: **${PET_BUYABLE_SPECIES.join("**, **")}**, or **phoenix** (rebirth **${PET_REBIRTH_EXCLUSIVE_MIN}+**).\n\n${petShopCatalogLines()}`,
            ),
          ],
        });
        return;
      }
      const specBuy = PET_SPECIES[species]!;
      if (!specBuy) {
        await message.reply({
          embeds: [errorEmbed("Unknown species.")],
        });
        return;
      }
      const { price } = specBuy;
      try {
        const row = await prisma.$transaction(async (tx) => {
          const u = await tx.economyUser.upsert({
            where: { discordUserId: uid },
            create: { discordUserId: uid },
            update: {},
          });
          if (u.cash < price) throw new Error("POOR");
          if (
            species === "phoenix" &&
            u.rebirthCount < PET_REBIRTH_EXCLUSIVE_MIN
          ) {
            throw new Error("REBIRTH");
          }
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
              title: `${ecoM.petfood} Pet adopted`,
              description:
                `You adopted ${petSpeciesEmoji(species)} **${specBuy.label}** for **${formatCash(price)}**.\n` +
                `${ecoM.petfood} Feeding costs **${formatCash(specBuy.feedCost)}** per feed.\n` +
                `Balance: **${formatCash(row)}** · Use **\`.pets\`** to equip or feed.`,
            }),
          ],
        });
      } catch (e) {
        if (e instanceof Error && e.message === "POOR") {
          await message.reply({
            embeds: [
              errorEmbed(
                `You need **${formatCash(price)}** for a **${specBuy.label}**.`,
              ),
            ],
          });
          return;
        }
        if (e instanceof Error && e.message === "REBIRTH") {
          await message.reply({
            embeds: [
              errorEmbed(
                `**Ash phoenix** unlocks at **${PET_REBIRTH_EXCLUSIVE_MIN}** rebirths — check **\`.rebirth stats\`**.`,
              ),
            ],
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
      const equippedRow = await prisma.economyPet.findFirst({
        where: { ownerId: uid, speciesKey: species, equipped: true },
        orderBy: { createdAt: "desc" },
      });
      const callEq = equippedRow
        ? formatPetCallName(equippedRow)
        : PET_SPECIES[species]!.label;
      await message.reply({
        embeds: [
          minimalEmbed({
            title: `${ecoM.petfood} Pet equipped`,
            description:
              `Your ${petSpeciesEmoji(species)} **${callEq}** is now equipped — small **.gamble** payout bonus while it stays equipped.\n` +
              `Rename anytime: **\`.pet name <name>\`** · **\`.pet info\`** for stats.`,
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
          const happyGain = rollPetFeedHappyGain(pet.speciesKey);
          const newHappy = Math.min(
            PET_MAX_HAPPINESS,
            pet.happiness + happyGain,
          );
          const feedXp = Math.floor(
            (petFeedXpFor(pet.speciesKey) * petFeedXpMultBps(u)) / 10000,
          );
          const newXp = pet.xp + feedXp;
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
          const display = formatPetCallName(pet);
          return {
            display,
            speciesKey: pet.speciesKey,
            feedXp,
            prevXp: pet.xp,
            prevHappy: pet.happiness,
            xp: newXp,
            happiness: newHappy,
          };
        });
        const { total } = computeEquippedPetGambleBonus(
          fed.xp,
          fed.happiness,
          fed.speciesKey,
        );
        await message.reply({
          embeds: [
            minimalEmbed({
              title: `${ecoM.petfood} Pet fed`,
              description:
                `Your **${fed.display}** · XP **${fed.prevXp.toLocaleString()} → ${fed.xp.toLocaleString()}** (+${fed.feedXp}) · ❤️ **${fed.prevHappy} → ${fed.happiness}**.\n` +
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
          "Unknown subcommand. Try **`.pet buy`**, **`.pet equip`**, **`.pet feed`**, **`.pet name`**, or **`.pet info`**.",
        ),
      ],
    });
  },
};
