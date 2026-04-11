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
  WORK_COOLDOWN_MS,
  WORK_JOB_ORDER,
  WORK_JOBS,
  WORK_TREASURY_FEE_PCT,
  formatCooldownHuman,
  type WorkJobKey,
  type WorkMinigameKind,
} from "./economy-tuning";
import { formatCash } from "./money";
import { rebirthBoostEarn } from "./rebirth-income";
import {
  creditTreasuryInTx,
  type LedgerReason,
} from "./wallet";

type InboxState = { kind: "inbox_triage"; correct: 0 | 1 | 2 };
type DispatchState = {
  kind: "double_dispatch";
  a: 0 | 1 | 2;
  b: 0 | 1 | 2;
  step: 0 | 1;
};
type TicketState = { kind: "ticket_queue"; correct: 0 | 1 | 2 | 3 };
type ExecState = {
  kind: "exec_review";
  r1: 0 | 1 | 2 | 3;
  r2: 0 | 1 | 2 | 3;
  round: 0 | 1;
};

type WorkMinigameState =
  | InboxState
  | DispatchState
  | TicketState
  | ExecState;

type WorkSession = {
  userId: string;
  job: WorkJobKey;
  token: string;
  createdAt: number;
  state: WorkMinigameState;
};

const workSessions = new Map<string, WorkSession>();
const workSessionByUser = new Map<string, string>();

function newToken(): string {
  return randomBytes(5).toString("hex");
}

function kindForJob(job: WorkJobKey): WorkMinigameKind {
  return WORK_JOBS[job].minigame;
}

function rollWorkMinigameState(kind: WorkMinigameKind): WorkMinigameState {
  switch (kind) {
    case "inbox_triage":
      return { kind: "inbox_triage", correct: randomInt(0, 3) as 0 | 1 | 2 };
    case "double_dispatch":
      return {
        kind: "double_dispatch",
        a: randomInt(0, 3) as 0 | 1 | 2,
        b: randomInt(0, 3) as 0 | 1 | 2,
        step: 0,
      };
    case "ticket_queue":
      return {
        kind: "ticket_queue",
        correct: randomInt(0, 4) as 0 | 1 | 2 | 3,
      };
    case "exec_review":
      return {
        kind: "exec_review",
        r1: randomInt(0, 4) as 0 | 1 | 2 | 3,
        r2: randomInt(0, 4) as 0 | 1 | 2 | 3,
        round: 0,
      };
  }
}

export function normalizeOwnedJobs(raw: unknown): WorkJobKey[] {
  const base = new Set<WorkJobKey>(["intern"]);
  if (Array.isArray(raw)) {
    for (const x of raw) {
      if (typeof x === "string" && x in WORK_JOBS) {
        base.add(x as WorkJobKey);
      }
    }
  }
  return WORK_JOB_ORDER.filter((k) => base.has(k));
}

export function parseWorkJobKey(s: string): WorkJobKey | null {
  if (s in WORK_JOBS) return s as WorkJobKey;
  return null;
}

function nextBuyableJob(owned: WorkJobKey[]): WorkJobKey | null {
  const idx = Math.max(...owned.map((k) => WORK_JOB_ORDER.indexOf(k)));
  const next = WORK_JOB_ORDER[idx + 1];
  return next ?? null;
}

export function workClockInButtonId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:work:s`;
}

export function workPickButtonId(
  uid: string,
  token: string,
  idx: number,
): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:work:p:${token}:${idx}`;
}

export function workBuyButtonId(uid: string, job: WorkJobKey): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:work:b:${job}`;
}

export function workEquipSelectId(uid: string): string {
  return `${ECON_INTERACTION_PREFIX}${uid}:work:sel:eq`;
}

function pruneWorkSessions(): void {
  const now = Date.now();
  for (const [tok, s] of workSessions) {
    if (now - s.createdAt > GATHER_MINIGAME_TTL_MS) {
      workSessions.delete(tok);
      if (workSessionByUser.get(s.userId) === tok) {
        workSessionByUser.delete(s.userId);
      }
    }
  }
}

export async function buildWorkMenuEmbed(params: {
  userId: string;
  equipped: WorkJobKey;
  owned: WorkJobKey[];
  cash: bigint;
  cooldownEndsAt: number | null;
}): Promise<EmbedBuilder> {
  const row = WORK_JOBS[params.equipped];
  const next = nextBuyableJob(params.owned);
  const nextLine = next
    ? `**Next to buy:** **${WORK_JOBS[next].label}** for **${formatCash(WORK_JOBS[next].price)}** (green button).`
    : "_You unlocked every role in this track._";

  const cd =
    params.cooldownEndsAt !== null && params.cooldownEndsAt > Date.now()
      ? `On break — next shift <t:${Math.floor(params.cooldownEndsAt / 1000)}:R> (<t:${Math.floor(params.cooldownEndsAt / 1000)}:f>)`
      : "**Ready to work** — no cooldown.";

  const mgLabel: Record<WorkMinigameKind, string> = {
    inbox_triage: "Inbox — one urgent email; pick the right **Triage** slot.",
    double_dispatch: "Dispatch — two tasks; correct **Route** button each time.",
    ticket_queue: "Queue — board shows a desk letter; **match** the ticket lane.",
    exec_review: "Review — two rounds; **match** the stamp mark.",
  };

  const cdHuman = formatCooldownHuman(WORK_COOLDOWN_MS);
  const catalogLines = WORK_JOB_ORDER.map((k) => {
    const j = WORK_JOBS[k];
    const priceStr = j.price === 0n ? "**Free**" : formatCash(j.price);
    let tag = "";
    if (k === params.equipped) tag = " **← equipped**";
    else if (params.owned.includes(k)) tag = " _(owned — use dropdown to equip)_";
    else tag = " _(locked until you buy in order)_";
    return `**${j.label}** · ${priceStr} · gross **${formatCash(j.minGross)}–${formatCash(j.maxGross)}**${tag}`;
  }).join("\n");

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`${ecoM.cash} Jobs — ${row.label}`)
    .setDescription(
      `**Quick guide**\n` +
        `• Run **\`.work\`** anytime to open this menu (server text channels only).\n` +
        `• Press **Clock in** → finish the shift minigame (**${GATHER_MINIGAME_TTL_SEC}s** to act each step).\n` +
        `• **Win:** gross pay is random in your role’s range; **${WORK_TREASURY_FEE_PCT}%** goes to treasury, **you keep the rest**. Then **${cdHuman}** before the next shift.\n` +
        `• **Wrong pick or timeout:** no pay, **no** cooldown.\n` +
        `• Promote **in order** (intern → clerk → …) with **Buy …**. Use the **dropdown** to switch roles you already own.\n\n` +
        `**Your status**\n` +
        `${ecoM.wallet} **${formatCash(params.cash)}**\n` +
        `${cd}\n` +
        `**This role’s minigame:** ${mgLabel[row.minigame]}\n` +
        `${nextLine}\n\n` +
        `**All roles — unlock price & gross pay range**\n` +
        `${catalogLines}\n\n` +
        `_Gross = before **${WORK_TREASURY_FEE_PCT}%** treasury; net is what lands in your wallet._`,
    )
    .setFooter({
      text: "Only you can use these buttons. Other users see a blocked message.",
    });
}

export function buildWorkMenuRows(params: {
  userId: string;
  equipped: WorkJobKey;
  owned: WorkJobKey[];
}): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
  rows.push(
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(workClockInButtonId(params.userId))
        .setLabel("Clock in")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("💼"),
    ),
  );

  const opts = params.owned.map((k) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(WORK_JOBS[k].label)
      .setValue(k)
      .setDefault(k === params.equipped),
  );
  if (opts.length > 1) {
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(workEquipSelectId(params.userId))
          .setPlaceholder("Switch to a role you unlocked…")
          .addOptions(opts),
      ),
    );
  }

  const next = nextBuyableJob(params.owned);
  if (next) {
    const price = WORK_JOBS[next].price;
    rows.push(
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(workBuyButtonId(params.userId, next))
          .setLabel(`Buy ${WORK_JOBS[next].label} (${formatCash(price)})`)
          .setStyle(ButtonStyle.Success),
      ),
    );
  }

  return rows;
}

function buildWorkMinigameEmbed(
  userId: string,
  job: WorkJobKey,
  state: WorkMinigameState,
): EmbedBuilder {
  const name = WORK_JOBS[job].label;
  const miniHint = `\n\n_${GATHER_MINIGAME_TTL_SEC}s to tap each step · wrong or timeout = no pay._`;
  switch (state.kind) {
    case "inbox_triage":
      return new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle("📥 Inbox flood")
        .setDescription(
          `<@${userId}> · **${name}**\n\n` +
            `Three threads flash — **one** is actually urgent. **Triage** it!` +
            miniHint,
        );
    case "double_dispatch":
      return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(
          `🚚 ${state.step === 0 ? "First" : "Second"} delivery`,
        )
        .setDescription(
          `<@${userId}> · **${name}**\n\n` +
            (state.step === 0
              ? `**Route the first package** — pick the correct lane.`
              : `**Second drop-off** — pick the right route again.`) +
            miniHint,
        );
    case "ticket_queue": {
      const letters = ["A", "B", "C", "D"] as const;
      const hint = letters[state.correct];
      return new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🎫 Service desk")
        .setDescription(
          `<@${userId}> · **${name}**\n\n` +
            `The caller ID blinks **${hint}**. Open that **lane**!` +
            miniHint,
        );
    }
    case "exec_review": {
      const marks = ["●", "▲", "■", "★"];
      const idx = state.round === 0 ? state.r1 : state.r2;
      return new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle(
          `✅ ${state.round === 0 ? "Stamp 1" : "Stamp 2"}`,
        )
        .setDescription(
          `<@${userId}> · **${name}**\n\n` +
            `Approval mark: **${marks[idx]}** — pick the same stamp.` +
            miniHint,
        );
    }
  }
}

function buildWorkMinigameRows(
  userId: string,
  token: string,
  state: WorkMinigameState,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const row = (
    labels: string[],
    indices: number[],
  ): ActionRowBuilder<MessageActionRowComponentBuilder> => {
    const bs = labels.map((label, i) =>
      new ButtonBuilder()
        .setCustomId(workPickButtonId(userId, token, indices[i]!))
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary),
    );
    return new ActionRowBuilder<
      MessageActionRowComponentBuilder
    >().addComponents(bs);
  };

  switch (state.kind) {
    case "inbox_triage":
      return [
        row(["Triage ①", "Triage ②", "Triage ③"], [0, 1, 2]),
      ];
    case "double_dispatch":
      return [row(["Route ①", "Route ②", "Route ③"], [0, 1, 2])];
    case "ticket_queue":
      return [row(["Lane A", "Lane B", "Lane C", "Lane D"], [0, 1, 2, 3])];
    case "exec_review":
      return [row(["●", "▲", "■", "★"], [0, 1, 2, 3])];
  }
}

export async function restoreWorkMenuMessage(
  interaction: MessageComponentInteraction,
  userId: string,
): Promise<void> {
  const prisma = getBotPrisma();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: userId },
  });
  const cash = u?.cash ?? 0n;
  const equipped =
    parseWorkJobKey(u?.workJobEquipped ?? "intern") ?? "intern";
  const owned = normalizeOwnedJobs(u?.workJobsOwned);
  let cdEnd: number | null = null;
  if (u?.lastWorkAt) {
    cdEnd = u.lastWorkAt.getTime() + WORK_COOLDOWN_MS;
  }
  const embed = await buildWorkMenuEmbed({
    userId,
    equipped,
    owned,
    cash,
    cooldownEndsAt: cdEnd,
  });
  const rows = buildWorkMenuRows({ userId, equipped, owned });
  await interaction.editReply({
    content: `<@${userId}>`,
    embeds: [embed],
    components: rows,
    allowedMentions: { users: [userId] },
  });
}

export async function handleWorkMenuClockIn(
  interaction: MessageComponentInteraction,
  uid: string,
): Promise<void> {
  pruneWorkSessions();
  const prisma = getBotPrisma();
  const now = Date.now();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: uid },
  });
  const lastWork = u?.lastWorkAt?.getTime();
  if (lastWork !== undefined && now - lastWork < WORK_COOLDOWN_MS) {
    await interaction.reply({
      ephemeral: true,
      content: `⏳ Still on break — next shift <t:${Math.floor((lastWork + WORK_COOLDOWN_MS) / 1000)}:R>.`,
    });
    return;
  }

  let equipped =
    parseWorkJobKey(u?.workJobEquipped ?? "intern") ?? "intern";
  const owned = normalizeOwnedJobs(u?.workJobsOwned);
  if (!owned.includes(equipped)) {
    equipped = "intern";
    await prisma.economyUser
      .update({
        where: { discordUserId: uid },
        data: { workJobEquipped: "intern" },
      })
      .catch(() => {});
  }

  const token = newToken();
  const kind = kindForJob(equipped);
  const state = rollWorkMinigameState(kind);
  const session: WorkSession = {
    userId: uid,
    job: equipped,
    token,
    createdAt: now,
    state,
  };
  const oldTok = workSessionByUser.get(uid);
  if (oldTok) workSessions.delete(oldTok);
  workSessions.set(token, session);
  workSessionByUser.set(uid, token);

  await interaction.deferUpdate();
  await interaction.editReply({
    content: `<@${uid}>`,
    embeds: [buildWorkMinigameEmbed(uid, equipped, state)],
    components: buildWorkMinigameRows(uid, token, state),
    allowedMentions: { users: [uid] },
  });
}

function clearUserWorkSession(uid: string, token: string): void {
  workSessions.delete(token);
  if (workSessionByUser.get(uid) === token) {
    workSessionByUser.delete(uid);
  }
}

export async function handleWorkMinigamePick(params: {
  interaction: MessageComponentInteraction;
  uid: string;
  token: string;
  pick: number;
}): Promise<void> {
  const { interaction, uid, token, pick } = params;
  pruneWorkSessions();
  const session = workSessions.get(token);
  await interaction.deferUpdate();

  if (!session || session.userId !== uid) {
    await interaction.followUp({
      ephemeral: true,
      content: "That shift expired — open **`.work`** again.",
    });
    await restoreWorkMenuMessage(interaction, uid);
    return;
  }

  if (Date.now() - session.createdAt > GATHER_MINIGAME_TTL_MS) {
    clearUserWorkSession(uid, token);
    await interaction.followUp({
      ephemeral: true,
      content: "⏰ Shift window closed — no pay for this one.",
    });
    await restoreWorkMenuMessage(interaction, uid);
    return;
  }

  const { state, job } = session;
  let advanced: WorkMinigameState | null = null;
  let won = false;
  let fail = false;

  switch (state.kind) {
    case "inbox_triage":
      if (pick === state.correct) won = true;
      else fail = true;
      break;
    case "double_dispatch":
      if (state.step === 0) {
        if (pick === state.a) advanced = { ...state, step: 1 };
        else fail = true;
      } else if (pick === state.b) {
        won = true;
      } else {
        fail = true;
      }
      break;
    case "ticket_queue":
      if (pick === state.correct) won = true;
      else fail = true;
      break;
    case "exec_review":
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
    clearUserWorkSession(uid, token);
    await interaction.followUp({
      ephemeral: true,
      content: "Shift flopped — **no payout** this time (cooldown not started).",
    });
    await restoreWorkMenuMessage(interaction, uid);
    return;
  }

  if (advanced) {
    session.state = advanced;
    session.createdAt = Date.now();
    workSessions.set(token, session);
    await interaction.editReply({
      content: `<@${uid}>`,
      embeds: [buildWorkMinigameEmbed(uid, job, advanced)],
      components: buildWorkMinigameRows(uid, token, advanced),
      allowedMentions: { users: [uid] },
    });
    return;
  }

  if (!won) return;

  clearUserWorkSession(uid, token);
  const tuning = WORK_JOBS[job];
  const gross = BigInt(
    randomInt(Number(tuning.minGross), Number(tuning.maxGross) + 1),
  );
  const fee =
    (gross * BigInt(WORK_TREASURY_FEE_PCT) + 99n) / 100n;
  const net = gross - fee;
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
      if (row.lastWorkAt) {
        if (now - row.lastWorkAt.getTime() < WORK_COOLDOWN_MS) {
          throw new Error("COOLDOWN");
        }
      }
      const paid = rebirthBoostEarn(row, member, net);
      const next = row.cash + paid;
      await tx.economyUser.update({
        where: { discordUserId: uid },
        data: { cash: next, lastWorkAt: new Date(now) },
      });
      await tx.economyLedger.create({
        data: {
          discordUserId: uid,
          delta: paid,
          balanceAfter: next,
          reason: "work" satisfies LedgerReason,
          meta: {
            gross: gross.toString(),
            fee: fee.toString(),
            job,
            minigame: tuning.minigame,
            netBeforeRebirth: net.toString(),
          },
        },
      });
      if (fee > 0n) {
        await creditTreasuryInTx(tx, {
          delta: fee,
          reason: "treasury_fee",
          meta: { kind: "work_fee", userId: uid },
          actorUserId: uid,
        });
      }
      return { newCash: next, paid };
    });
    await interaction.followUp({
      ephemeral: true,
      content:
        `**Shift complete!** Paid **${formatCash(paid)}** (gross **${formatCash(gross)}**, treasury **${formatCash(fee)}**) · Balance **${formatCash(newCash)}**`,
    });
    await restoreWorkMenuMessage(interaction, uid);
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
        content: "Could not pay out — try **`.work`** again.",
      });
    }
    await restoreWorkMenuMessage(interaction, uid);
  }
}

export async function handleWorkBuyJob(
  interaction: MessageComponentInteraction,
  uid: string,
  jobKey: WorkJobKey,
): Promise<void> {
  await interaction.deferUpdate();
  const prisma = getBotPrisma();
  const price = WORK_JOBS[jobKey].price;
  if (price <= 0n) {
    await interaction.followUp({
      ephemeral: true,
      content: "That's the starter role — already yours.",
    });
    await restoreWorkMenuMessage(interaction, uid);
    return;
  }

  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: uid },
  });
  const owned = normalizeOwnedJobs(u?.workJobsOwned);
  const next = nextBuyableJob(owned);
  if (next !== jobKey) {
    await interaction.followUp({
      ephemeral: true,
      content: "Promotions are **in order** — check the menu for the next role.",
    });
    await restoreWorkMenuMessage(interaction, uid);
    return;
  }
  if (owned.includes(jobKey)) {
    await interaction.followUp({
      ephemeral: true,
      content: "You already unlocked that role.",
    });
    await restoreWorkMenuMessage(interaction, uid);
    return;
  }
  if (!u || u.cash < price) {
    await interaction.followUp({
      ephemeral: true,
      content: `You need **${formatCash(price)}** (you have **${formatCash(u?.cash ?? 0n)}**).`,
    });
    await restoreWorkMenuMessage(interaction, uid);
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.economyUser.findUnique({
        where: { discordUserId: uid },
      });
      if (!row || row.cash < price) throw new Error("INSUFFICIENT_FUNDS");
      const newOwned = [...new Set([...owned, jobKey])];
      const newCash = row.cash - price;
      await tx.economyUser.update({
        where: { discordUserId: uid },
        data: {
          cash: newCash,
          workJobsOwned: newOwned,
          workJobEquipped: jobKey,
        },
      });
      await tx.economyLedger.create({
        data: {
          discordUserId: uid,
          delta: -price,
          balanceAfter: newCash,
          reason: "shop_buy" satisfies LedgerReason,
          meta: { kind: "work_job", job: jobKey },
        },
      });
    });
    await interaction.followUp({
      ephemeral: true,
      content: `Equipped **${WORK_JOBS[jobKey].label}** — clock in when ready!`,
    });
  } catch {
    await interaction.followUp({
      ephemeral: true,
      content: "Purchase failed — try again.",
    });
  }
  await restoreWorkMenuMessage(interaction, uid);
}

export async function handleWorkEquipSelect(
  interaction: MessageComponentInteraction,
  uid: string,
  choice: string,
): Promise<void> {
  await interaction.deferUpdate();
  const key = parseWorkJobKey(choice);
  if (!key) {
    await interaction.followUp({
      ephemeral: true,
      content: "Invalid role choice.",
    });
    await restoreWorkMenuMessage(interaction, uid);
    return;
  }

  const prisma = getBotPrisma();
  const u = await prisma.economyUser.findUnique({
    where: { discordUserId: uid },
  });
  const owned = normalizeOwnedJobs(u?.workJobsOwned);
  if (!owned.includes(key)) {
    await interaction.followUp({
      ephemeral: true,
      content: "You haven't unlocked that role.",
    });
    await restoreWorkMenuMessage(interaction, uid);
    return;
  }

  await prisma.economyUser.update({
    where: { discordUserId: uid },
    data: { workJobEquipped: key },
  });
  await interaction.followUp({
    ephemeral: true,
    content: `Now working as **${WORK_JOBS[key].label}**.`,
  });
  await restoreWorkMenuMessage(interaction, uid);
}
