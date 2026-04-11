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
import { ecoBtn, ecoM, petSpeciesEmoji } from "./custom-emojis";
import {
  PET_BUYABLE_SPECIES,
  PET_FEED_TREASURY_PCT,
  PET_MAX_HAPPINESS,
  PET_SPECIES,
  petFeedXpFor,
  rollPetFeedHappyGain,
} from "./economy-tuning";
import { formatPetGambleFooterLine } from "./payout-multiplier";
import { petFeedXpMultBps } from "./rebirth-mult";
import { formatCash } from "./money";
import {
  creditTreasuryInTx,
  type LedgerReason,
} from "./wallet";

const PETS_PER_PAGE = 2;

function clampPetListPage(page: number, total: number): number {
  const maxPage = Math.max(0, Math.ceil(total / PETS_PER_PAGE) - 1);
  return Math.max(0, Math.min(maxPage, page));
}

/** Shown in menus and replies: custom nickname + species, or species only. */
export function formatPetCallName(p: {
  nickname: string | null;
  speciesKey: string;
}): string {
  const spec = PET_SPECIES[p.speciesKey];
  const label = spec?.label ?? p.speciesKey;
  const n = p.nickname?.trim();
  if (n) return `"${n}" (${label})`;
  return label;
}

/** Prev page — must differ from next (`pn`) so IDs stay unique when both target page 0. */
export function petPrevPageButtonId(uid: string, targetPage: number): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:pet:pp:${targetPage}`;
}

export function petNextPageButtonId(uid: string, targetPage: number): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:pet:pn:${targetPage}`;
}

/** Short custom IDs (page + slot) — avoids 100-char limit and `:` inside cuid breaking parse. */
export function petEquipButtonId(
  uid: string,
  page: number,
  slot: number,
): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:pet:e:${page}:${slot}`;
}

export function petFeedButtonId(
  uid: string,
  page: number,
  slot: number,
): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:pet:f:${page}:${slot}`;
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

/** Footer line for the pets menu — documents gamble bonus; always short enough for Discord. */
export async function petMenuFooterNote(ownerId: string): Promise<string> {
  const prisma = getBotPrisma();
  const eq = await prisma.economyPet.findFirst({
    where: { ownerId, equipped: true },
    select: { xp: true, happiness: true, speciesKey: true },
  });
  return formatPetGambleFooterLine(eq);
}

export function buildPetMenuEmbed(params: {
  ownerId: string;
  page: number;
  total: number;
  pets: EconomyPet[];
  /** Always set (e.g. from {@link petMenuFooterNote}) so bonus rules stay visible. */
  footerNote: string;
}): EmbedBuilder {
  const { page, total, pets, ownerId, footerNote } = params;
  const maxPage = Math.max(0, Math.ceil(total / PETS_PER_PAGE) - 1);
  if (pets.length === 0) {
    const shop = PET_BUYABLE_SPECIES.map((s) => {
      const sp = PET_SPECIES[s]!;
      return `${petSpeciesEmoji(s)} **${sp.label}** — **${formatCash(sp.price)}** · ${ecoM.petfood} feed **${formatCash(sp.feedCost)}**`;
    }).join("\n");
    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${ecoM.petfood} Pets`)
      .setDescription(
        `<@${ownerId}> has no pets yet.\n\n**Adoption fees**\n${shop}\n\nBuy with **\`.pet buy <dog|cat|rabbit>\`** or open **\`.pets\`** after adopting.\nName your equipped pet: **\`.pet name <name>\`**.`,
      )
      .setFooter({ text: footerNote.slice(0, 2048) });
  }
  const lines = pets.map((p) => {
    const spec = PET_SPECIES[p.speciesKey];
    const feed = spec ? formatCash(spec.feedCost) : "—";
    const eq = p.equipped ? " _(equipped)_" : "";
    const ic = petSpeciesEmoji(p.speciesKey);
    const call = formatPetCallName(p);
    return `${ic} **${call}**${eq} · ${ecoM.xp} **${p.xp}** · ❤️ **${p.happiness}** · ${ecoM.petfood} **${feed}**/feed · \`${p.id.slice(0, 8)}…\``;
  });
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${ecoM.petfood} Pets — page ${page + 1}/${maxPage + 1}`)
    .setDescription(lines.join("\n\n"))
    .setFooter({ text: footerNote.slice(0, 2048) });
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
        .setCustomId(petPrevPageButtonId(ownerId, Math.max(0, page - 1)))
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(petNextPageButtonId(ownerId, Math.min(maxPage, page + 1)))
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= maxPage),
    ),
  );

  const speciesBtn = (key: string) => {
    switch (key) {
      case "dog":
        return ecoBtn.dog;
      case "cat":
        return ecoBtn.cat;
      case "rabbit":
      case "fox":
        return ecoBtn.bunny;
      case "rat":
        return ecoBtn.bunny;
      case "crow":
        return ecoBtn.cat;
      default:
        return ecoBtn.petfood;
    }
  };

  pets.forEach((p, slot) => {
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(petEquipButtonId(ownerId, page, slot))
          .setLabel(p.equipped ? "Equipped" : "Equip")
          .setStyle(p.equipped ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(p.equipped)
          .setEmoji(speciesBtn(p.speciesKey)),
        new ButtonBuilder()
          .setCustomId(petFeedButtonId(ownerId, page, slot))
          .setLabel("Feed")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(ecoBtn.petfood),
      ),
    );
  });

  return rows;
}

export async function handlePetMenuButton(params: {
  uid: string;
  tok: string[];
  interaction: ButtonInteraction;
}): Promise<boolean> {
  const { uid, tok, interaction } = params;
  const prisma = getBotPrisma();

  if (
    (tok[1] === "pp" || tok[1] === "pn" || tok[1] === "p") &&
    tok[2] !== undefined
  ) {
    const rawPage = parseInt(tok[2]!, 10);
    if (!Number.isFinite(rawPage) || rawPage < 0) return true;
    await interaction.deferUpdate();
    const probe = await loadPetPage(uid, rawPage);
    const page = clampPetListPage(rawPage, probe.total);
    const { pets, total } =
      page === rawPage ? probe : await loadPetPage(uid, page);
    const footerNote = await petMenuFooterNote(uid);
    await interaction.message.edit({
      embeds: [
        buildPetMenuEmbed({ ownerId: uid, page, total, pets, footerNote }),
      ],
      components: buildPetMenuRows({ ownerId: uid, page, total, pets }),
    });
    return true;
  }

  if (tok[1] === "e" && tok[2] !== undefined && tok[3] !== undefined) {
    const rawPage = parseInt(tok[2]!, 10);
    const slot = parseInt(tok[3]!, 10);
    if (
      !Number.isFinite(rawPage) ||
      rawPage < 0 ||
      !Number.isFinite(slot) ||
      slot < 0 ||
      slot >= PETS_PER_PAGE
    ) {
      return true;
    }
    await interaction.deferUpdate();
    const probeE = await loadPetPage(uid, rawPage);
    const page = clampPetListPage(rawPage, probeE.total);
    const { pets: pagePets } =
      page === rawPage ? probeE : await loadPetPage(uid, page);
    const target = pagePets[slot];
    if (!target) {
      await interaction.followUp({
        ephemeral: true,
        content: "❌ That pet row is out of date — run **`.pets`** again.",
      });
      return true;
    }
    const petId = target.id;
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
    const { pets, total } = await loadPetPage(uid, page);
    const footerNoteEq = await petMenuFooterNote(uid);
    await interaction.message.edit({
      embeds: [
        buildPetMenuEmbed({
          ownerId: uid,
          page,
          total,
          pets,
          footerNote: footerNoteEq,
        }),
      ],
      components: buildPetMenuRows({ ownerId: uid, page, total, pets }),
    });
    return true;
  }

  if (tok[1] === "f" && tok[2] !== undefined && tok[3] !== undefined) {
    const rawPage = parseInt(tok[2]!, 10);
    const slot = parseInt(tok[3]!, 10);
    if (
      !Number.isFinite(rawPage) ||
      rawPage < 0 ||
      !Number.isFinite(slot) ||
      slot < 0 ||
      slot >= PETS_PER_PAGE
    ) {
      return true;
    }
    await interaction.deferUpdate();
    const probeF = await loadPetPage(uid, rawPage);
    const page = clampPetListPage(rawPage, probeF.total);
    const { pets: pagePetsF } =
      page === rawPage ? probeF : await loadPetPage(uid, page);
    const targetPet = pagePetsF[slot];
    if (!targetPet) {
      await interaction.followUp({
        ephemeral: true,
        content: "❌ That pet row is out of date — run **`.pets`** again.",
      });
      return true;
    }
    const petId = targetPet.id;
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
        const happyGain = rollPetFeedHappyGain(pet.speciesKey);
        const newHappy = Math.min(
          PET_MAX_HAPPINESS,
          pet.happiness + happyGain,
        );
        const feedXp = Math.floor(
          (petFeedXpFor(pet.speciesKey) * petFeedXpMultBps(u)) / 10000,
        );
        const cashAfter = u.cash - spec.feedCost;
        await tx.economyUser.update({
          where: { discordUserId: uid },
          data: { cash: cashAfter },
        });
        await tx.economyPet.update({
          where: { id: petId },
          data: {
            xp: pet.xp + feedXp,
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
    const { pets, total } = await loadPetPage(uid, page);
    const footerNoteFd = await petMenuFooterNote(uid);
    await interaction.message.edit({
      embeds: [
        buildPetMenuEmbed({
          ownerId: uid,
          page,
          total,
          pets,
          footerNote: footerNoteFd,
        }),
      ],
      components: buildPetMenuRows({ ownerId: uid, page, total, pets }),
    });
    return true;
  }

  // Legacy: `ke:uid:pet:e:<petId>` / `pet:f:<petId>` (before page:slot IDs)
  if (tok[1] === "e" && tok[2] && tok[3] === undefined) {
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
    const footerNoteLe = await petMenuFooterNote(uid);
    await interaction.message.edit({
      embeds: [
        buildPetMenuEmbed({
          ownerId: uid,
          page: 0,
          total,
          pets,
          footerNote: footerNoteLe,
        }),
      ],
      components: buildPetMenuRows({ ownerId: uid, page: 0, total, pets }),
    });
    return true;
  }

  if (tok[1] === "f" && tok[2] && tok[3] === undefined) {
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
        const happyGain = rollPetFeedHappyGain(pet.speciesKey);
        const newHappy = Math.min(
          PET_MAX_HAPPINESS,
          pet.happiness + happyGain,
        );
        const feedXp = Math.floor(
          (petFeedXpFor(pet.speciesKey) * petFeedXpMultBps(u)) / 10000,
        );
        const cashAfter = u.cash - spec.feedCost;
        await tx.economyUser.update({
          where: { discordUserId: uid },
          data: { cash: cashAfter },
        });
        await tx.economyPet.update({
          where: { id: petId },
          data: {
            xp: pet.xp + feedXp,
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
    const footerNoteLf = await petMenuFooterNote(uid);
    await interaction.message.edit({
      embeds: [
        buildPetMenuEmbed({
          ownerId: uid,
          page: 0,
          total,
          pets,
          footerNote: footerNoteLf,
        }),
      ],
      components: buildPetMenuRows({ ownerId: uid, page: 0, total, pets }),
    });
    return true;
  }

  return false;
}
