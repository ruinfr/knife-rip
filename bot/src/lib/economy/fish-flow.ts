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
  FISH_COOLDOWN_MS,
  FISHING_POLE_ORDER,
  FISHING_POLES,
  GATHER_MINIGAME_TTL_MS,
  GATHER_MINIGAME_TTL_SEC,
  formatCooldownHuman,
  type FishingMinigameKind,
  type FishingPoleKey,
} from "./economy-tuning";
import { formatCash } from "./money";
import { rebirthBoostEarn } from "./rebirth-income";
import type { LedgerReason } from "./wallet";

type SnapState = { kind: "snap"; correct: 0 | 1 | 2 };
type DoubleSnapState = {
  kind: "double_snap";
  a: 0 | 1 | 2;
  b: 0 | 1 | 2;
  step: 0 | 1;
};
type SchoolState = { kind: "school"; correct: 0 | 1 | 2 | 3 };
type TrophyState = {
  kind: "trophy";
  r1: 0 | 1 | 2 | 3;
  r2: 0 | 1 | 2 | 3;
  round: 0 | 1;
};

type MinigameState = SnapState | DoubleSnapState | SchoolState | TrophyState;

type FishSession = {
  userId: string;
  pole: FishingPoleKey;
  token: string;
  createdAt: number;
  state: MinigameState;
};

const fishSessions = new Map<string, FishSession>();
const fishSessionByUser = new Map<string, string>();

function newToken(): string {
  return randomBytes(5).toString("hex");
}

function kindForPole(pole: FishingPoleKey): FishingMinigameKind {
  return FISHING_POLES[pole].minigame;
}

function rollMinigameState(kind: FishingMinigameKind): MinigameState {
  switch (kind) {
    case "snap":
      return { kind: "snap", correct: randomInt(0, 3) as 0 | 1 | 2 };
    case "double_snap":
      return {
        kind: "double_snap",
        a: randomInt(0, 3) as 0 | 1 | 2,
        b: randomInt(0, 3) as 0 | 1 | 2,
        step: 0,
      };
    case "school":
      return { kind: "school", correct: randomInt(0, 4) as 0 | 1 | 2 | 3 };
    case "trophy":
      return {
        kind: "trophy",
        r1: randomInt(0, 4) as 0 | 1 | 2 | 3,
        r2: randomInt(0, 4) as 0 | 1 | 2 | 3,
        round: 0,
      };
  }
}

export function normalizeOwnedPoles(raw: unknown): FishingPoleKey[] {
  const base = new Set<FishingPoleKey>(["twig"]);
  if (Array.isArray(raw)) {
    for (const x of raw) {
      if (typeof x === "string" && x in FISHING_POLES) {
        base.add(x as FishingPoleKey);
      }
    }
  }
  return FISHING_POLE_ORDER.filter((k) => base.has(k));
}

export function parseFishingPoleKey(s: string): FishingPoleKey | null {
  if (s in FISHING_POLES) return s as FishingPoleKey;
  return null;
}

function nextBuyablePole(owned: FishingPoleKey[]): FishingPoleKey | null {
  const idx = Math.max(...owned.map((k) => FISHING_POLE_ORDER.indexOf(k)));
  const next = FISHING_POLE_ORDER[idx + 1];
  return next ?? null;
}

export function fishCastButtonId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:fish:c`;
}

export function fishPickButtonId(
  uid: string,
  token: string,
  idx: number,
): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:fish:p:${token}:${idx}`;
}

export function fishBuyButtonId(uid: string, pole: FishingPoleKey): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:fish:b:${pole}`;
}

export function fishEquipSelectId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:fish:sel:eq`;
}

function pruneFishSessions(): void {
  const now = Date.now();
  for (const [tok, s] of fishSessions) {
    if (now - s.createdAt > GATHER_MINIGAME_TTL_MS) {
      fishSessions.delete(tok);
      if (fishSessionByUser.get(s.userId) === tok) {
        fishSessionByUser.delete(s.userId);
      }
    }
  }
}

export async function buildFishMenuEmbed(params: {
  userId: string;
  equipped: FishingPoleKey;
  owned: FishingPoleKey[];
  cash: bigint;
  cooldownEndsAt: number | null;
}): Promise<EmbedBuilder> {
  const pole = FISHING_POLES[params.equipped];
  const next = nextBuyablePole(params.owned);
  const nextLine = next
    ? `**Next to buy:** **${FISHING_POLES[next].label}** for **${formatCash(FISHING_POLES[next].price)}** (green button).`
    : "_You own every rod._";

  const cd =
    params.cooldownEndsAt !== null && params.cooldownEndsAt > Date.now()
      ? `On cooldown — ready <t:${Math.floor(params.cooldownEndsAt / 1000)}:R> (<t:${Math.floor(params.cooldownEndsAt / 1000)}:f>)`
      : "**Ready to fish** — no cooldown.";

  const mgLabel: Record<FishingMinigameKind, string> = {
    snap: "Bite — pick the right **Set hook** button.",
    double_snap: "Two bites — correct **Hook** button each time.",
    school: "School — sonar shows a letter; pick the **matching** fish.",
    trophy: "Trophy fight — two rounds; pick the **matching** symbol.",
  };

  const cdHuman = formatCooldownHuman(FISH_COOLDOWN_MS);
  const catalogLines = FISHING_POLE_ORDER.map((k) => {
    const p = FISHING_POLES[k];
    const priceStr = p.price === 0n ? "**Free**" : formatCash(p.price);
    let tag = "";
    if (k === params.equipped) tag = " **← equipped**";
    else if (params.owned.includes(k)) tag = " _(owned — use dropdown to equip)_";
    else tag = " _(locked until you buy in order)_";
    return `**${p.label}** · ${priceStr} · catch **${formatCash(p.minPayout)}–${formatCash(p.maxPayout)}**${tag}`;
  }).join("\n");

  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`${ecoM.fish} Fishing — ${pole.label}`)
    .setDescription(
      `**Quick guide**\n` +
        `• Run **\`.fish\`** anytime to open this menu (server text channels only).\n` +
        `• Press **Cast line** → complete the button minigame (**${GATHER_MINIGAME_TTL_SEC}s** to act each step).\n` +
        `• **Win:** random cash between your rod’s min and max, then **${cdHuman}** catch cooldown.\n` +
        `• **Wrong pick or timeout:** no cash, **no** cooldown — try again.\n` +
        `• Buy better rods **in order** with **Buy …** (green). If you own several, use the **dropdown** to equip.\n\n` +
        `**Your status**\n` +
        `${ecoM.wallet} **${formatCash(params.cash)}**\n` +
        `${cd}\n` +
        `**This rod’s minigame:** ${mgLabel[pole.minigame]}\n` +
        `${nextLine}\n\n` +
        `**All rods — price & catch range**\n` +
        `${catalogLines}\n\n` +
        `_Not the **Mines** casino game — use **\`.gamble\`** for that._`,
    )
    .setFooter({
      text: "Only you can use these buttons. Other users see a blocked message.",
    });
}

export function buildFishMenuRows(params: {
  userId: string;
  equipped: FishingPoleKey;
  owned: FishingPoleKey[];
}): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(fishCastButtonId(params.userId))
        .setLabel("Cast line")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎣"),
    ),
  );

  const opts = params.owned.map((k) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(FISHING_POLES[k].label)
      .setValue(k)
      .setDefault(k === params.equipped),
  );
  if (opts.length > 1) {
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(fishEquipSelectId(params.userId))
          .setPlaceholder("Equip a rod you own…")
          .addOptions(opts),
      ),
    );
  }

  const next = nextBuyablePole(params.owned);
  if (next) {
    const price = FISHING_POLES[next].price;
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(fishBuyButtonId(params.userId, next))
          .setLabel(`Buy ${FISHING_POLES[next].label} (${formatCash(price)})`)
          .setStyle(ButtonStyle.Success),
      ),
    );
  }

  return rows;
}

function buildMinigameEmbed(
  userId: string,
  pole: FishingPoleKey,
  state: MinigameState,
): EmbedBuilder {
  const poleName = FISHING_POLES[pole].label;
  const miniHint = `\n\n_${GATHER_MINIGAME_TTL_SEC}s to tap each step · wrong or timeout = no catch._`;
  switch (state.kind) {
    case "snap":
      return new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(`${ecoM.fish} Something tugs…`)
        .setDescription(
          `<@${userId}> · **${poleName}**\n\n` +
            `Three ripples — **one** is the fish. **Set the hook** on the right one!` +
            miniHint,
        );
    case "double_snap":
      return new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle(
          `${ecoM.fish} ${state.step === 0 ? "First" : "Second"} tug`,
        )
        .setDescription(
          `<@${userId}> · **${poleName}**\n\n` +
            (state.step === 0
              ? `**First bite** — pick the correct **Hook** button.`
              : `**Another run!** — pick the right **Hook** again.`) +
            miniHint,
        );
    case "school": {
      const letters = ["A", "B", "C", "D"] as const;
      const hint = letters[state.correct];
      return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`${ecoM.fish} Mark the school`)
        .setDescription(
          `<@${userId}> · **${poleName}**\n\n` +
            `Your sonar blips **${hint}**. Press the matching fish!` +
            miniHint,
        );
    }
    case "trophy": {
      const marks = ["⬤", "◆", "△", "□"];
      const idx = state.round === 0 ? state.r1 : state.r2;
      return new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle(
          `${ecoM.fish} ${state.round === 0 ? "Round 1" : "Round 2"}`,
        )
        .setDescription(
          `<@${userId}> · **${poleName}**\n\n` +
            `Target mark: **${marks[idx]}** — pick the same symbol below.` +
            miniHint,
        );
    }
  }
}

function buildMinigameRows(
  userId: string,
  token: string,
  state: MinigameState,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const row = (
    labels: string[],
    indices: number[],
  ): ActionRowBuilder<MessageActionRowComponentBuilder> => {
    const bs = labels.map((label, i) =>
      new ButtonBuilder()
        .setCustomId(fishPickButtonId(userId, token, indices[i]!))
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary),
    );
    return new ActionRowBuilder<
      MessageActionRowComponentBuilder
    >().addComponents(bs);
  };

  switch (state.kind) {
    case "snap":
      return [row(["Set hook ①", "Set hook ②", "Set hook ③"], [0, 1, 2])];
    case "double_snap":
      return [row(["Hook ①", "Hook ②", "Hook ③"], [0, 1, 2])];
    case "school":
      return [row(["Fish A", "Fish B", "Fish C", "Fish D"], [0, 1, 2, 3])];
    case "trophy":
      return [row(["⬤", "◆", "△", "□"], [0, 1, 2, 3])];
  }
}

export async function restoreFishMenuMessage(
  interaction: MessageComponentInteraction,
  userId: string,
): Promise<void> {
  const prisma = getBotPrisma();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: userId },
  });
  const cash = u?.cash ?? 0n;
  const equipped =
    parseFishingPoleKey(u?.fishingPoleEquipped ?? "twig") ?? "twig";
  const owned = normalizeOwnedPoles(u?.fishingPolesOwned);
  let cdEnd: number | null = null;
  if (u?.lastFishAt) {
    cdEnd = u.lastFishAt.getTime() + FISH_COOLDOWN_MS;
  }
  const embed = await buildFishMenuEmbed({
    userId,
    equipped,
    owned,
    cash,
    cooldownEndsAt: cdEnd,
  });
  const rows = buildFishMenuRows({ userId, equipped, owned });
  await interaction.editReply({
    content: `<@${userId}>`,
    embeds: [embed],
    components: rows,
    allowedMentions: { users: [userId] },
  });
}

export async function handleFishMenuCast(
  interaction: MessageComponentInteraction,
  uid: string,
): Promise<void> {
  pruneFishSessions();
  const prisma = getBotPrisma();
  const now = Date.now();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: uid },
  });
  const lastFish = u?.lastFishAt?.getTime();
  if (lastFish !== undefined && now - lastFish < FISH_COOLDOWN_MS) {
    await interaction.reply({
      ephemeral: true,
      content: `⏳ Waters rest — <t:${Math.floor((lastFish + FISH_COOLDOWN_MS) / 1000)}:R>.`,
    });
    return;
  }

  let equipped =
    parseFishingPoleKey(u?.fishingPoleEquipped ?? "twig") ?? "twig";
  const owned = normalizeOwnedPoles(u?.fishingPolesOwned);
  if (!owned.includes(equipped)) {
    equipped = "twig";
    await prisma.economyUser
      .update({
        where: { discordUserId: uid },
        data: { fishingPoleEquipped: "twig" },
      })
      .catch(() => {});
  }

  const token = newToken();
  const kind = kindForPole(equipped);
  const state = rollMinigameState(kind);
  const session: FishSession = {
    userId: uid,
    pole: equipped,
    token,
    createdAt: now,
    state,
  };
  const oldTok = fishSessionByUser.get(uid);
  if (oldTok) fishSessions.delete(oldTok);
  fishSessions.set(token, session);
  fishSessionByUser.set(uid, token);

  await interaction.deferUpdate();
  await interaction.editReply({
    content: `<@${uid}>`,
    embeds: [buildMinigameEmbed(uid, equipped, state)],
    components: buildMinigameRows(uid, token, state),
    allowedMentions: { users: [uid] },
  });
}

function clearUserFishSession(uid: string, token: string): void {
  fishSessions.delete(token);
  if (fishSessionByUser.get(uid) === token) {
    fishSessionByUser.delete(uid);
  }
}

export async function handleFishMinigamePick(params: {
  interaction: MessageComponentInteraction;
  uid: string;
  token: string;
  pick: number;
}): Promise<void> {
  const { interaction, uid, token, pick } = params;
  pruneFishSessions();
  const session = fishSessions.get(token);
  await interaction.deferUpdate();

  if (!session || session.userId !== uid) {
    await interaction.followUp({
      ephemeral: true,
      content: "That cast expired — open **`.fish`** again.",
    });
    await restoreFishMenuMessage(interaction, uid);
    return;
  }

  if (Date.now() - session.createdAt > GATHER_MINIGAME_TTL_MS) {
    clearUserFishSession(uid, token);
    await interaction.followUp({
      ephemeral: true,
      content: "⏰ You waited too long — the fish escaped.",
    });
    await restoreFishMenuMessage(interaction, uid);
    return;
  }

  const { state, pole } = session;
  let advanced: MinigameState | null = null;
  let won = false;
  let fail = false;

  switch (state.kind) {
    case "snap":
      if (pick === state.correct) won = true;
      else fail = true;
      break;
    case "double_snap":
      if (state.step === 0) {
        if (pick === state.a) advanced = { ...state, step: 1 };
        else fail = true;
      } else if (pick === state.b) {
        won = true;
      } else {
        fail = true;
      }
      break;
    case "school":
      if (pick === state.correct) won = true;
      else fail = true;
      break;
    case "trophy":
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
    clearUserFishSession(uid, token);
    await interaction.followUp({
      ephemeral: true,
      content: `${ecoM.fish} The line went slack — no payout this time.`,
    });
    await restoreFishMenuMessage(interaction, uid);
    return;
  }

  if (advanced) {
    session.state = advanced;
    session.createdAt = Date.now();
    fishSessions.set(token, session);
    await interaction.editReply({
      content: `<@${uid}>`,
      embeds: [buildMinigameEmbed(uid, pole, advanced)],
      components: buildMinigameRows(uid, token, advanced),
      allowedMentions: { users: [uid] },
    });
    return;
  }

  if (!won) return;

  clearUserFishSession(uid, token);
  const tuning = FISHING_POLES[pole];
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
      if (row.lastFishAt) {
        if (now - row.lastFishAt.getTime() < FISH_COOLDOWN_MS) {
          throw new Error("COOLDOWN");
        }
      }
      const paid = rebirthBoostEarn(row, member, gain);
      const next = row.cash + paid;
      await tx.economyUser.update({
        where: { discordUserId: uid },
        data: { cash: next, lastFishAt: new Date(now) },
      });
      await tx.economyLedger.create({
        data: {
          discordUserId: uid,
          delta: paid,
          balanceAfter: next,
          reason: "gather" satisfies LedgerReason,
          meta: { kind: "fish", pole, minigame: tuning.minigame },
        },
      });
      return { newCash: next, paid };
    });
    await interaction.followUp({
      ephemeral: true,
      content:
        `**Nice catch!** +**${formatCash(paid)}** · Balance **${formatCash(newCash)}**`,
    });
    await restoreFishMenuMessage(interaction, uid);
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
        content: "Could not credit — try **`.fish`** again.",
      });
    }
    await restoreFishMenuMessage(interaction, uid);
  }
}

export async function handleFishBuyPole(
  interaction: MessageComponentInteraction,
  uid: string,
  poleKey: FishingPoleKey,
): Promise<void> {
  await interaction.deferUpdate();
  const prisma = getBotPrisma();
  const price = FISHING_POLES[poleKey].price;
  if (price <= 0n) {
    await interaction.followUp({
      ephemeral: true,
      content: "That's the starter rod — already yours.",
    });
    await restoreFishMenuMessage(interaction, uid);
    return;
  }

  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: uid },
  });
  const owned = normalizeOwnedPoles(u?.fishingPolesOwned);
  const next = nextBuyablePole(owned);
  if (next !== poleKey) {
    await interaction.followUp({
      ephemeral: true,
      content: "Buy poles **in order** — check the menu for the next upgrade.",
    });
    await restoreFishMenuMessage(interaction, uid);
    return;
  }
  if (owned.includes(poleKey)) {
    await interaction.followUp({
      ephemeral: true,
      content: "You already own that rod.",
    });
    await restoreFishMenuMessage(interaction, uid);
    return;
  }
  if (!u || u.cash < price) {
    await interaction.followUp({
      ephemeral: true,
      content: `You need **${formatCash(price)}** (you have **${formatCash(u?.cash ?? 0n)}**).`,
    });
    await restoreFishMenuMessage(interaction, uid);
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.economyUser.findUnique({
        where: { discordUserId: uid },
      });
      if (!row || row.cash < price) throw new Error("INSUFFICIENT_FUNDS");
      const newOwned = [...new Set([...owned, poleKey])];
      const newCash = row.cash - price;
      await tx.economyUser.update({
        where: { discordUserId: uid },
        data: {
          cash: newCash,
          fishingPolesOwned: newOwned,
          fishingPoleEquipped: poleKey,
        },
      });
      await tx.economyLedger.create({
        data: {
          discordUserId: uid,
          delta: -price,
          balanceAfter: newCash,
          reason: "shop_buy" satisfies LedgerReason,
          meta: { kind: "fishing_pole", pole: poleKey },
        },
      });
    });
    await interaction.followUp({
      ephemeral: true,
      content: `Equipped **${FISHING_POLES[poleKey].label}** — go cast!`,
    });
  } catch {
    await interaction.followUp({
      ephemeral: true,
      content: "Purchase failed — try again.",
    });
  }
  await restoreFishMenuMessage(interaction, uid);
}

export async function handleFishEquipSelect(
  interaction: MessageComponentInteraction,
  uid: string,
  choice: string,
): Promise<void> {
  await interaction.deferUpdate();
  const key = parseFishingPoleKey(choice);
  if (!key) {
    await interaction.followUp({
      ephemeral: true,
      content: "Invalid rod choice.",
    });
    await restoreFishMenuMessage(interaction, uid);
    return;
  }

  const prisma = getBotPrisma();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: uid },
  });
  const owned = normalizeOwnedPoles(u?.fishingPolesOwned);
  if (!owned.includes(key)) {
    await interaction.followUp({
      ephemeral: true,
      content: "You don't own that rod.",
    });
    await restoreFishMenuMessage(interaction, uid);
    return;
  }

  await prisma.economyUser.update({
    where: { discordUserId: uid },
    data: { fishingPoleEquipped: key },
  });
  await interaction.followUp({
    ephemeral: true,
    content: `Equipped **${FISHING_POLES[key].label}**.`,
  });
  await restoreFishMenuMessage(interaction, uid);
}
