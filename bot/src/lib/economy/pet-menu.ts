import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import type { EconomyPet } from "@prisma/client";
import { getBotPrisma } from "../db-prisma";
import { ECON_INTERACTION_PREFIX } from "./config";
import { ecoM } from "./custom-emojis";
import {
  PET_FEED_HAPPY_MAX,
  PET_FEED_HAPPY_MIN,
  PET_FEED_TREASURY_PCT,
  PET_FEED_XP,
  PET_MAX_HAPPINESS,
  PET_SPECIES,
} from "./economy-tuning";
import { formatCash } from "./money";
import {
  creditTreasuryInTx,
  type LedgerReason,
} from "./wallet";

const PETS_PER_PAGE = 2;

export function petPageButtonId(uid: string, page: number): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:pet:p:${page}`;
}

export function petEquipButtonId(uid: string, petId: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:pet:e:${petId}`;
}

export function petFeedButtonId(uid: string, petId: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:pet:f:${petId}`;
}

export async function loadPetPage(
  ownerId: string,
  page: number,
): Promise<{ pets: EconomyPet[]; total: number }> {
  const prisma = getBotPrisma();
  const total = await prisma.economyPet.count({ where: { ownerId } });
  const pets = await prisma.economyPet.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
    skip: page * PETS_PER_PAGE,
    take: PETS_PER_PAGE,
  });
  return { pets, total };
}

export function buildPetMenuEmbed(params: {
  ownerId: string;
  page: number;
  total: number;
  pets: EconomyPet[];
}): EmbedBuilder {
  const { page, total, pets, ownerId } = params;
  const maxPage = Math.max(0, Math.ceil(total / PETS_PER_PAGE) - 1);
  if (pets.length === 0) {
    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${ecoM.cash} Pets`)
      .setDescription(
        `<@${ownerId}> has no pets yet.\nBuy one with **\`.pet buy <dog|cat|rabbit>\`**.`,
      );
  }
  const lines = pets.map((p) => {
    const spec = PET_SPECIES[p.speciesKey];
    const label = spec?.label ?? p.speciesKey;
    const eq = p.equipped ? " _(equipped)_" : "";
    return `**${label}**${eq} · XP **${p.xp}** · ❤️ **${p.happiness}** · \`${p.id.slice(0, 8)}…\``;
  });
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${ecoM.cash} Pets — page ${page + 1}/${maxPage + 1}`)
    .setDescription(lines.join("\n\n"));
}

export function buildPetMenuRows(params: {
  ownerId: string;
  page: number;
  total: number;
  pets: EconomyPet[];
}): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const { ownerId, page, total, pets } = params;
  const maxPage = Math.max(0, Math.ceil(total / PETS_PER_PAGE) - 1);
  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(petPageButtonId(ownerId, Math.max(0, page - 1)))
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(petPageButtonId(ownerId, Math.min(maxPage, page + 1)))
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= maxPage),
    ),
  );

  for (const p of pets) {
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(petEquipButtonId(ownerId, p.id))
          .setLabel(p.equipped ? "Equipped" : "Equip")
          .setStyle(p.equipped ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(p.equipped),
        new ButtonBuilder()
          .setCustomId(petFeedButtonId(ownerId, p.id))
          .setLabel("Feed")
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  }

  return rows;
}

export async function handlePetMenuButton(params: {
  uid: string;
  tok: string[];
  interaction: ButtonInteraction;
}): Promise<boolean> {
  const { uid, tok, interaction } = params;
  const prisma = getBotPrisma();

  if (tok[1] === "p" && tok[2]) {
    const page = parseInt(tok[2]!, 10);
    if (!Number.isFinite(page) || page < 0) return true;
    await interaction.deferUpdate();
    const { pets, total } = await loadPetPage(uid, page);
    await interaction.message.edit({
      embeds: [buildPetMenuEmbed({ ownerId: uid, page, total, pets })],
      components: buildPetMenuRows({ ownerId: uid, page, total, pets }),
    });
    return true;
  }

  if (tok[1] === "e" && tok[2]) {
    const petId = tok[2]!;
    await interaction.deferUpdate();
    await prisma.$transaction(async (tx) => {
      const pet = await tx.economyPet.findFirst({
        where: { id: petId, ownerId: uid },
      });
      if (!pet) return;
      await tx.economyPet.updateMany({
        where: { ownerId: uid },
        data: { equipped: false },
      });
      await tx.economyPet.update({
        where: { id: petId },
        data: { equipped: true },
      });
    });
    const { pets, total } = await loadPetPage(uid, 0);
    await interaction.message.edit({
      embeds: [buildPetMenuEmbed({ ownerId: uid, page: 0, total, pets })],
      components: buildPetMenuRows({ ownerId: uid, page: 0, total, pets }),
    });
    return true;
  }

  if (tok[1] === "f" && tok[2]) {
    const petId = tok[2]!;
    await interaction.deferUpdate();
    try {
      await prisma.$transaction(async (tx) => {
        const pet = await tx.economyPet.findFirst({
          where: { id: petId, ownerId: uid },
        });
        if (!pet) throw new Error("NONE");
        const spec = PET_SPECIES[pet.speciesKey];
        if (!spec) throw new Error("BAD");
        const u = await tx.economyUser.findUnique({
          where: { discordUserId: uid },
        });
        if (!u || u.cash < spec.feedCost) throw new Error("POOR");
        const happyGain =
          PET_FEED_HAPPY_MIN +
          Math.floor(
            Math.random() * (PET_FEED_HAPPY_MAX - PET_FEED_HAPPY_MIN + 1),
          );
        const newHappy = Math.min(
          PET_MAX_HAPPINESS,
          pet.happiness + happyGain,
        );
        const cashAfter = u.cash - spec.feedCost;
        await tx.economyUser.update({
          where: { discordUserId: uid },
          data: { cash: cashAfter },
        });
        await tx.economyPet.update({
          where: { id: petId },
          data: {
            xp: pet.xp + PET_FEED_XP,
            happiness: newHappy,
          },
        });
        await tx.economyLedger.create({
          data: {
            discordUserId: uid,
            delta: -spec.feedCost,
            balanceAfter: cashAfter,
            reason: "pet" satisfies LedgerReason,
            meta: { op: "feed", petId },
          },
        });
        const toTreasury =
          (spec.feedCost * BigInt(PET_FEED_TREASURY_PCT) + 99n) / 100n;
        if (toTreasury > 0n) {
          await creditTreasuryInTx(tx, {
            delta: toTreasury,
            reason: "treasury_fee",
            meta: { kind: "pet_feed", userId: uid },
            actorUserId: uid,
          });
        }
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      await interaction.followUp({
        ephemeral: true,
        content:
          code === "POOR"
            ? "❌ Not enough cash to feed."
            : code === "NONE"
              ? "❌ Pet not found."
              : "❌ Could not feed.",
      });
      return true;
    }
    const { pets, total } = await loadPetPage(uid, 0);
    await interaction.message.edit({
      embeds: [buildPetMenuEmbed({ ownerId: uid, page: 0, total, pets })],
      components: buildPetMenuRows({ ownerId: uid, page: 0, total, pets }),
    });
    return true;
  }

  return false;
}
