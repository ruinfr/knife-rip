import { randomBytes, randomInt } from "crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type MessageComponentInteraction,
} from "discord.js";
import { getBotPrisma } from "../db-prisma";
import { ECON_INTERACTION_PREFIX } from "./config";
import { ecoM } from "./custom-emojis";
import {
  GATHER_MINIGAME_TTL_MS,
  GATHER_MINIGAME_TTL_SEC,
  MINING_PICK_ORDER,
  MINING_PICKS,
  MINE_COOLDOWN_MS,
  formatCooldownHuman,
  type MiningMinigameKind,
  type MiningPickKey,
} from "./economy-tuning";
import { formatCash } from "./money";
import { rebirthBoostEarn } from "./rebirth-income";
import type { LedgerReason } from "./wallet";

const PICKAXE_TITLE = "\u{26CF}\u{FE0F}";

type CrackState = { kind: "crack"; correct: 0 | 1 | 2 };
type VeinPairState = {
  kind: "vein_pair";
  a: 0 | 1 | 2;
  b: 0 | 1 | 2;
  step: 0 | 1;
};
type StratumState = { kind: "stratum"; correct: 0 | 1 | 2 | 3 };
type CoreRushState = {
  kind: "core_rush";
  r1: 0 | 1 | 2 | 3;
  r2: 0 | 1 | 2 | 3;
  round: 0 | 1;
};

type MineMinigameState =
  | CrackState
  | VeinPairState
  | StratumState
  | CoreRushState;

type MineSession = {
  userId: string;
  pick: MiningPickKey;
  token: string;
  createdAt: number;
  state: MineMinigameState;
};

const mineSessions = new Map<string, MineSession>();
const mineSessionByUser = new Map<string, string>();

function newToken(): string {
  return randomBytes(5).toString("hex");
}

function kindForPick(pick: MiningPickKey): MiningMinigameKind {
  return MINING_PICKS[pick].minigame;
}

function rollMineMinigameState(kind: MiningMinigameKind): MineMinigameState {
  switch (kind) {
    case "crack":
      return { kind: "crack", correct: randomInt(0, 3) as 0 | 1 | 2 };
    case "vein_pair":
      return {
        kind: "vein_pair",
        a: randomInt(0, 3) as 0 | 1 | 2,
        b: randomInt(0, 3) as 0 | 1 | 2,
        step: 0,
      };
    case "stratum":
      return { kind: "stratum", correct: randomInt(0, 4) as 0 | 1 | 2 | 3 };
    case "core_rush":
      return {
        kind: "core_rush",
        r1: randomInt(0, 4) as 0 | 1 | 2 | 3,
        r2: randomInt(0, 4) as 0 | 1 | 2 | 3,
        round: 0,
      };
  }
}

/** Pre–wood/stone/iron/diamond tier ids (DB may still hold these until migrated). */
const LEGACY_MINING_PICK: Record<string, MiningPickKey> = {
  copper: "stone",
  steel: "iron",
  laser: "diamond",
};

export function normalizeOwnedPicks(raw: unknown): MiningPickKey[] {
  const base = new Set<MiningPickKey>(["wood"]);
  if (Array.isArray(raw)) {
    for (const x of raw) {
      if (typeof x !== "string") continue;
      const k = parseMiningPickKey(x);
      if (k) base.add(k);
    }
  }
  return MINING_PICK_ORDER.filter((k) => base.has(k));
}

export function parseMiningPickKey(s: string): MiningPickKey | null {
  if (s in MINING_PICKS) return s as MiningPickKey;
  return LEGACY_MINING_PICK[s] ?? null;
}

function nextBuyablePick(owned: MiningPickKey[]): MiningPickKey | null {
  const idx = Math.max(...owned.map((k) => MINING_PICK_ORDER.indexOf(k)));
  const next = MINING_PICK_ORDER[idx + 1];
  return next ?? null;
}

export function mineDigButtonId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:mine:d`;
}

export function minePickButtonId(
  uid: string,
  token: string,
  idx: number,
): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:mine:p:${token}:${idx}`;
}

export function mineBuyButtonId(uid: string, pick: MiningPickKey): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:mine:b:${pick}`;
}

export function mineEquipSelectId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:mine:sel:eq`;
}

function pruneMineSessions(): void {
  const now = Date.now();
  for (const [tok, s] of mineSessions) {
    if (now - s.createdAt > GATHER_MINIGAME_TTL_MS) {
      mineSessions.delete(tok);
      if (mineSessionByUser.get(s.userId) === tok) {
        mineSessionByUser.delete(s.userId);
      }
    }
  }
}

export async function buildMineMenuEmbed(params: {
  userId: string;
  equipped: MiningPickKey;
  owned: MiningPickKey[];
  cash: bigint;
  cooldownEndsAt: number | null;
}): Promise<EmbedBuilder> {
  const row = MINING_PICKS[params.equipped];
  const next = nextBuyablePick(params.owned);
  const nextLine = next
    ? `**Next to buy:** **${MINING_PICKS[next].label}** for **${formatCash(MINING_PICKS[next].price)}** (green button).`
    : "_You own every pickaxe._";

  const cd =
    params.cooldownEndsAt !== null && params.cooldownEndsAt > Date.now()
      ? `On cooldown — ready <t:${Math.floor(params.cooldownEndsAt / 1000)}:R> (<t:${Math.floor(params.cooldownEndsAt / 1000)}:f>)`
      : "**Ready to mine** — no cooldown.";

  const mgLabel: Record<MiningMinigameKind, string> = {
    crack: "Crack — one weak seam; pick the right **Strike**.",
    vein_pair: "Vein — two weak spots; correct **Chip** each time.",
    stratum: "Stratum — survey shows a layer letter; **match** it.",
    core_rush: "Core — two rounds; **match** the fracture symbol.",
  };

  const cdHuman = formatCooldownHuman(MINE_COOLDOWN_MS);
  const catalogLines = MINING_PICK_ORDER.map((k) => {
    const p = MINING_PICKS[k];
    const priceStr = p.price === 0n ? "**Free**" : formatCash(p.price);
    let tag = "";
    if (k === params.equipped) tag = " **← equipped**";
    else if (params.owned.includes(k)) tag = " _(owned — use dropdown to equip)_";
    else tag = " _(locked until you buy in order)_";
    return `**${p.label}** · ${priceStr} · ore **${formatCash(p.minPayout)}–${formatCash(p.maxPayout)}**${tag}`;
  }).join("\n");

  return new EmbedBuilder()
    .setColor(0x7f8c8d)
    .setTitle(`${PICKAXE_TITLE} Mining — ${row.label}`)
    .setDescription(
      `**Quick guide**\n` +
        `• Run **\`.mine\`** anytime to open this menu (server text channels only).\n` +
        `• Press **Dig** → complete the button minigame (**${GATHER_MINIGAME_TTL_SEC}s** to act each step).\n` +
        `• **Win:** random ore value in your pick’s range, then **${cdHuman}** mine cooldown.\n` +
        `• **Wrong pick or timeout:** no cash, **no** cooldown.\n` +
        `• Buy better pickaxes **in order** (wood → stone → iron → diamond) with **Buy …**. Use the **dropdown** to swap owned picks.\n\n` +
        `**Your status**\n` +
        `${ecoM.wallet} **${formatCash(params.cash)}**\n` +
        `${cd}\n` +
        `**This pick’s minigame:** ${mgLabel[row.minigame]}\n` +
        `${nextLine}\n\n` +
        `**All pickaxes — price & ore range**\n` +
        `${catalogLines}\n\n` +
        `_This is **gathering**, not the **Mines** casino — use **\`.gamble\`** for that._`,
    )
    .setFooter({
      text: "Only you can use these buttons. Other users see a blocked message.",
    });
}

export function buildMineMenuRows(params: {
  userId: string;
  equipped: MiningPickKey;
  owned: MiningPickKey[];
}): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(mineDigButtonId(params.userId))
        .setLabel("Dig")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("⛏️"),
    ),
  );

  const opts = params.owned.map((k) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(MINING_PICKS[k].label)
      .setValue(k)
      .setDefault(k === params.equipped),
  );
  if (opts.length > 1) {
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(mineEquipSelectId(params.userId))
          .setPlaceholder("Equip a pickaxe you own…")
          .addOptions(opts),
      ),
    );
  }

  const next = nextBuyablePick(params.owned);
  if (next) {
    const price = MINING_PICKS[next].price;
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(mineBuyButtonId(params.userId, next))
          .setLabel(`Buy ${MINING_PICKS[next].label} (${formatCash(price)})`)
          .setStyle(ButtonStyle.Success),
      ),
    );
  }

  return rows;
}

function buildMineMinigameEmbed(
  userId: string,
  pick: MiningPickKey,
  state: MineMinigameState,
): EmbedBuilder {
  const name = MINING_PICKS[pick].label;
  const miniHint = `\n\n_${GATHER_MINIGAME_TTL_SEC}s to tap each step · wrong or timeout = no ore._`;
  switch (state.kind) {
    case "crack":
      return new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle(`${PICKAXE_TITLE} Weak seam`)
        .setDescription(
          `<@${userId}> · **${name}**\n\n` +
            `Three cracks — **one** will give. **Strike** the right one!` +
            miniHint,
        );
    case "vein_pair":
      return new EmbedBuilder()
        .setColor(0xb7950b)
        .setTitle(
          `${PICKAXE_TITLE} ${state.step === 0 ? "First" : "Second"} vein`,
        )
        .setDescription(
          `<@${userId}> · **${name}**\n\n` +
            (state.step === 0
              ? `**First pocket** — pick the correct **Chip** spot.`
              : `**Deeper vein** — pick the right **Chip** again.`) +
            miniHint,
        );
    case "stratum": {
      const letters = ["A", "B", "C", "D"] as const;
      const hint = letters[state.correct];
      return new EmbedBuilder()
        .setColor(0x5d6d7e)
        .setTitle(`${PICKAXE_TITLE} Survey reading`)
        .setDescription(
          `<@${userId}> · **${name}**\n\n` +
            `Core sample highlights layer **${hint}**. Mine that stratum!` +
            miniHint,
        );
    }
    case "core_rush": {
      const marks = ["◇", "⬡", "△", "▢"];
      const idx = state.round === 0 ? state.r1 : state.r2;
      return new EmbedBuilder()
        .setColor(0xc0392b)
        .setTitle(
          `${PICKAXE_TITLE} ${state.round === 0 ? "Fracture 1" : "Fracture 2"}`,
        )
        .setDescription(
          `<@${userId}> · **${name}**\n\n` +
            `Target fracture: **${marks[idx]}** — match it below.` +
            miniHint,
        );
    }
  }
}

function buildMineMinigameRows(
  userId: string,
  token: string,
  state: MineMinigameState,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const row = (
    labels: string[],
    indices: number[],
  ): ActionRowBuilder<MessageActionRowComponentBuilder> => {
    const bs = labels.map((label, i) =>
      new ButtonBuilder()
        .setCustomId(minePickButtonId(userId, token, indices[i]!))
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary),
    );
    return new ActionRowBuilder<
      MessageActionRowComponentBuilder
    >().addComponents(bs);
  };

  switch (state.kind) {
    case "crack":
      return [row(["Strike ①", "Strike ②", "Strike ③"], [0, 1, 2])];
    case "vein_pair":
      return [row(["Chip ①", "Chip ②", "Chip ③"], [0, 1, 2])];
    case "stratum":
      return [row(["Layer A", "Layer B", "Layer C", "Layer D"], [0, 1, 2, 3])];
    case "core_rush":
      return [row(["◇", "⬡", "△", "▢"], [0, 1, 2, 3])];
  }
}

export async function restoreMineMenuMessage(
  interaction: MessageComponentInteraction,
  userId: string,
): Promise<void> {
  const prisma = getBotPrisma();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: userId },
  });
  const cash = u?.cash ?? 0n;
  const equipped =
    parseMiningPickKey(u?.miningPickEquipped ?? "wood") ?? "wood";
  const owned = normalizeOwnedPicks(u?.miningPicksOwned);
  let cdEnd: number | null = null;
  if (u?.lastMineAt) {
    cdEnd = u.lastMineAt.getTime() + MINE_COOLDOWN_MS;
  }
  const embed = await buildMineMenuEmbed({
    userId,
    equipped,
    owned,
    cash,
    cooldownEndsAt: cdEnd,
  });
  const rows = buildMineMenuRows({ userId, equipped, owned });
  await interaction.editReply({
    content: `<@${userId}>`,
    embeds: [embed],
    components: rows,
    allowedMentions: { users: [userId] },
  });
}

export async function handleMineMenuDig(
  interaction: MessageComponentInteraction,
  uid: string,
): Promise<void> {
  pruneMineSessions();
  const prisma = getBotPrisma();
  const now = Date.now();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: uid },
  });
  const lastMine = u?.lastMineAt?.getTime();
  if (lastMine !== undefined && now - lastMine < MINE_COOLDOWN_MS) {
    await interaction.reply({
      ephemeral: true,
      content: `⏳ Pickaxe cooling — <t:${Math.floor((lastMine + MINE_COOLDOWN_MS) / 1000)}:R>.`,
    });
    return;
  }

  let equipped =
    parseMiningPickKey(u?.miningPickEquipped ?? "wood") ?? "wood";
  const owned = normalizeOwnedPicks(u?.miningPicksOwned);
  if (!owned.includes(equipped)) {
    equipped = "wood";
    await prisma.economyUser
      .update({
        where: { discordUserId: uid },
        data: { miningPickEquipped: "wood" },
      })
      .catch(() => {});
  }

  const token = newToken();
  const kind = kindForPick(equipped);
  const state = rollMineMinigameState(kind);
  const session: MineSession = {
    userId: uid,
    pick: equipped,
    token,
    createdAt: now,
    state,
  };
  const oldTok = mineSessionByUser.get(uid);
  if (oldTok) mineSessions.delete(oldTok);
  mineSessions.set(token, session);
  mineSessionByUser.set(uid, token);

  await interaction.deferUpdate();
  await interaction.editReply({
    content: `<@${uid}>`,
    embeds: [buildMineMinigameEmbed(uid, equipped, state)],
    components: buildMineMinigameRows(uid, token, state),
    allowedMentions: { users: [uid] },
  });
}

function clearUserMineSession(uid: string, token: string): void {
  mineSessions.delete(token);
  if (mineSessionByUser.get(uid) === token) {
    mineSessionByUser.delete(uid);
  }
}

export async function handleMineMinigamePick(params: {
  interaction: MessageComponentInteraction;
  uid: string;
  token: string;
  pick: number;
}): Promise<void> {
  const { interaction, uid, token, pick } = params;
  pruneMineSessions();
  const session = mineSessions.get(token);
  await interaction.deferUpdate();

  if (!session || session.userId !== uid) {
    await interaction.followUp({
      ephemeral: true,
      content: "That dig expired — open **`.mine`** again.",
    });
    await restoreMineMenuMessage(interaction, uid);
    return;
  }

  if (Date.now() - session.createdAt > GATHER_MINIGAME_TTL_MS) {
    clearUserMineSession(uid, token);
    await interaction.followUp({
      ephemeral: true,
      content: "⏰ You hesitated — the vein collapsed.",
    });
    await restoreMineMenuMessage(interaction, uid);
    return;
  }

  const { state, pick: pickaxe } = session;
  let advanced: MineMinigameState | null = null;
  let won = false;
  let fail = false;

  switch (state.kind) {
    case "crack":
      if (pick === state.correct) won = true;
      else fail = true;
      break;
    case "vein_pair":
      if (state.step === 0) {
        if (pick === state.a) advanced = { ...state, step: 1 };
        else fail = true;
      } else if (pick === state.b) {
        won = true;
      } else {
        fail = true;
      }
      break;
    case "stratum":
      if (pick === state.correct) won = true;
      else fail = true;
      break;
    case "core_rush":
      if (state.round === 0) {
        if (pick === state.r1) advanced = { ...state, round: 1 };
        else fail = true;
      } else if (pick === state.r2) {
        won = true;
      } else {
        fail = true;
      }
      break;
  }

  if (fail) {
    clearUserMineSession(uid, token);
    await interaction.followUp({
      ephemeral: true,
      content: `${PICKAXE_TITLE} Nothing but rubble — no payout.`,
    });
    await restoreMineMenuMessage(interaction, uid);
    return;
  }

  if (advanced) {
    session.state = advanced;
    session.createdAt = Date.now();
    mineSessions.set(token, session);
    await interaction.editReply({
      content: `<@${uid}>`,
      embeds: [buildMineMinigameEmbed(uid, pickaxe, advanced)],
      components: buildMineMinigameRows(uid, token, advanced),
      allowedMentions: { users: [uid] },
    });
    return;
  }

  if (!won) return;

  clearUserMineSession(uid, token);
  const tuning = MINING_PICKS[pickaxe];
  const gain = BigInt(
    randomInt(Number(tuning.minPayout), Number(tuning.maxPayout) + 1),
  );
  const now = Date.now();
  const prisma = getBotPrisma();
  const member =
    interaction.guild?.members.cache.get(uid) ??
    (await interaction.guild?.members.fetch(uid).catch(() => null)) ??
    null;
  try {
    const { newCash, paid } = await prisma.$transaction(async (tx) => {
      const row = await tx.economyUser.findUnique({
        where: { discordUserId: uid },
      });
      if (!row) throw new Error("NO_USER");
      if (row.lastMineAt) {
        if (now - row.lastMineAt.getTime() < MINE_COOLDOWN_MS) {
          throw new Error("COOLDOWN");
        }
      }
      const paid = rebirthBoostEarn(row, member, gain);
      const next = row.cash + paid;
      await tx.economyUser.update({
        where: { discordUserId: uid },
        data: { cash: next, lastMineAt: new Date(now) },
      });
      await tx.economyLedger.create({
        data: {
          discordUserId: uid,
          delta: paid,
          balanceAfter: next,
          reason: "gather" satisfies LedgerReason,
          meta: { kind: "mine", pick: pickaxe, minigame: tuning.minigame },
        },
      });
      return { newCash: next, paid };
    });
    await interaction.followUp({
      ephemeral: true,
      content:
        `**Mined ore!** +**${formatCash(paid)}** · Balance **${formatCash(newCash)}**`,
    });
    await restoreMineMenuMessage(interaction, uid);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "COOLDOWN") {
      await interaction.followUp({
        ephemeral: true,
        content: "⏳ Cooldown is active — try again in a moment.",
      });
    } else {
      await interaction.followUp({
        ephemeral: true,
        content: "Could not credit — try **`.mine`** again.",
      });
    }
    await restoreMineMenuMessage(interaction, uid);
  }
}

export async function handleMineBuyPickaxe(
  interaction: MessageComponentInteraction,
  uid: string,
  pickKey: MiningPickKey,
): Promise<void> {
  await interaction.deferUpdate();
  const prisma = getBotPrisma();
  const price = MINING_PICKS[pickKey].price;
  if (price <= 0n) {
    await interaction.followUp({
      ephemeral: true,
      content: "That's the starter pick — already yours.",
    });
    await restoreMineMenuMessage(interaction, uid);
    return;
  }

  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: uid },
  });
  const owned = normalizeOwnedPicks(u?.miningPicksOwned);
  const next = nextBuyablePick(owned);
  if (next !== pickKey) {
    await interaction.followUp({
      ephemeral: true,
      content: "Buy pickaxes **in order** — check the menu for the next upgrade.",
    });
    await restoreMineMenuMessage(interaction, uid);
    return;
  }
  if (owned.includes(pickKey)) {
    await interaction.followUp({
      ephemeral: true,
      content: "You already own that pickaxe.",
    });
    await restoreMineMenuMessage(interaction, uid);
    return;
  }
  if (!u || u.cash < price) {
    await interaction.followUp({
      ephemeral: true,
      content: `You need **${formatCash(price)}** (you have **${formatCash(u?.cash ?? 0n)}**).`,
    });
    await restoreMineMenuMessage(interaction, uid);
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.economyUser.findUnique({
        where: { discordUserId: uid },
      });
      if (!row || row.cash < price) throw new Error("INSUFFICIENT_FUNDS");
      const newOwned = [...new Set([...owned, pickKey])];
      const newCash = row.cash - price;
      await tx.economyUser.update({
        where: { discordUserId: uid },
        data: {
          cash: newCash,
          miningPicksOwned: newOwned,
          miningPickEquipped: pickKey,
        },
      });
      await tx.economyLedger.create({
        data: {
          discordUserId: uid,
          delta: -price,
          balanceAfter: newCash,
          reason: "shop_buy" satisfies LedgerReason,
          meta: { kind: "mining_pick", pick: pickKey },
        },
      });
    });
    await interaction.followUp({
      ephemeral: true,
      content: `Equipped **${MINING_PICKS[pickKey].label}** — go dig!`,
    });
  } catch {
    await interaction.followUp({
      ephemeral: true,
      content: "Purchase failed — try again.",
    });
  }
  await restoreMineMenuMessage(interaction, uid);
}

export async function handleMineEquipSelect(
  interaction: MessageComponentInteraction,
  uid: string,
  choice: string,
): Promise<void> {
  await interaction.deferUpdate();
  const key = parseMiningPickKey(choice);
  if (!key) {
    await interaction.followUp({
      ephemeral: true,
      content: "Invalid pickaxe choice.",
    });
    await restoreMineMenuMessage(interaction, uid);
    return;
  }

  const prisma = getBotPrisma();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: uid },
  });
  const owned = normalizeOwnedPicks(u?.miningPicksOwned);
  if (!owned.includes(key)) {
    await interaction.followUp({
      ephemeral: true,
      content: "You don't own that pickaxe.",
    });
    await restoreMineMenuMessage(interaction, uid);
    return;
  }

  await prisma.economyUser.update({
    where: { discordUserId: uid },
    data: { miningPickEquipped: key },
  });
  await interaction.followUp({
    ephemeral: true,
    content: `Equipped **${MINING_PICKS[key].label}**.`,
  });
  await restoreMineMenuMessage(interaction, uid);
}
