import { auth } from "@/auth";
import { applyGambleOutcomeInTx } from "@/lib/economy/gamble-outcome-tx";
import { WEB_MINES_GAME_KEY } from "@/lib/economy/arivix-cash-web";
import { formatCash, parsePositiveBigInt } from "@/lib/economy/money";
import {
  parseWebBlackjackState,
  WEB_BJ_SESSION_TTL_MS,
} from "@/lib/economy/web-blackjack";
import {
  parseWebMinesState,
  serializeWebMinesState,
  webMinesPayout,
  webMinesPayoutBps,
  webMinesPlaceMines,
  WEB_MINES_COUNT,
  WEB_MINES_MULT_CENTS,
  WEB_MINES_SAFE,
  WEB_MINES_SESSION_TTL_MS,
  WEB_MINES_TOTAL,
  type WebMinesStoredState,
} from "@/lib/economy/web-mines";
import {
  assertWebGambleAllowed,
  assertWebGambleCooldown,
  upsertEconomyUserInTx,
} from "@/lib/economy/web-gamble-precheck";
import { nextResponseForWebGambleError } from "@/lib/economy/web-gamble-http";
import { db } from "@/lib/db";
import { getDiscordAccountIdForUserId } from "@/lib/arivix-cash-session";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function balancesPayload(
  tx: Prisma.TransactionClient,
  discordId: string,
  cash: bigint,
) {
  const bankRow = await tx.economyUser.findUnique({
    where: { discordUserId: discordId },
    select: { bankCash: true },
  });
  const bankCash = bankRow?.bankCash ?? BigInt(0);
  const total = cash + bankCash;
  return {
    cash: cash.toString(),
    bankCash: bankCash.toString(),
    total: total.toString(),
    cashFormatted: formatCash(cash),
    bankCashFormatted: formatCash(bankCash),
    totalFormatted: formatCash(total),
  };
}

function playingResponse(
  state: WebMinesStoredState,
  bet: bigint,
  bal: Awaited<ReturnType<typeof balancesPayload>>,
) {
  const gems = state.safeRevealed.length;
  const bps = webMinesPayoutBps(gems);
  const mult = gems > 0 ? (bps / 10000).toFixed(2) : "—";
  const mc = WEB_MINES_MULT_CENTS;
  const cashout =
    gems >= 1 ? webMinesPayout(bet, gems, mc) : BigInt(0);
  return {
    ok: true as const,
    phase: "playing" as const,
    safeRevealed: state.safeRevealed,
    gems,
    minesRemaining: WEB_MINES_COUNT,
    safeRemaining: WEB_MINES_SAFE - gems,
    multiplier: mult,
    multiplierBps: bps,
    bet: bet.toString(),
    betFormatted: formatCash(bet),
    cashoutFormatted: gems >= 1 ? formatCash(cashout) : null,
    ...bal,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const discordId = await getDiscordAccountIdForUserId(session.user.id);
  if (!discordId) {
    return NextResponse.json(
      { error: "Discord account not linked" },
      { status: 400 },
    );
  }

  const row = await db.economyUser.findUnique({
    where: { discordUserId: discordId },
    select: {
      cash: true,
      bankCash: true,
      webMinesState: true,
    },
  });

  if (!row) {
    return NextResponse.json({ active: false });
  }

  const total = row.cash + row.bankCash;
  const bal = {
    cash: row.cash.toString(),
    bankCash: row.bankCash.toString(),
    total: total.toString(),
    cashFormatted: formatCash(row.cash),
    bankCashFormatted: formatCash(row.bankCash),
    totalFormatted: formatCash(total),
  };

  const state = parseWebMinesState(row.webMinesState);
  if (!state) {
    return NextResponse.json({ active: false, ...bal });
  }

  const now = Date.now();
  if (now - state.createdAt > WEB_MINES_SESSION_TTL_MS) {
    await db.economyUser.update({
      where: { discordUserId: discordId },
      data: { webMinesState: Prisma.DbNull },
    });
    return NextResponse.json({ active: false, ...bal });
  }

  const bet = BigInt(state.bet);
  return NextResponse.json({
    active: true,
    ...playingResponse(state, bet, bal),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const discordId = await getDiscordAccountIdForUserId(session.user.id);
  if (!discordId) {
    return NextResponse.json(
      { error: "Discord account not linked" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action =
    body &&
    typeof body === "object" &&
    "action" in body &&
    typeof (body as { action: unknown }).action === "string"
      ? (body as { action: string }).action
      : null;

  if (action !== "start" && action !== "pick" && action !== "cashout") {
    return jsonError('Use action "start", "pick", or "cashout"', 400);
  }

  const betRaw =
    body &&
    typeof body === "object" &&
    "bet" in body &&
    typeof (body as { bet: unknown }).bet === "string"
      ? (body as { bet: string }).bet
      : null;

  const indexRaw =
    body &&
    typeof body === "object" &&
    "index" in body &&
    typeof (body as { index: unknown }).index === "number"
      ? (body as { index: number }).index
      : null;

  let pickIndex: number | null = null;
  if (action === "pick") {
    if (indexRaw === null || !Number.isInteger(indexRaw)) {
      return jsonError("Missing or invalid index", 400);
    }
    if (indexRaw < 0 || indexRaw >= WEB_MINES_TOTAL) {
      return jsonError("Invalid tile", 400);
    }
    pickIndex = indexRaw;
  }

  try {
    if (action === "start") {
      if (!betRaw) return jsonError("Missing bet", 400);
      const bet = parsePositiveBigInt(betRaw);
      if (bet === null) return jsonError("Invalid bet", 400);

      const result = await db.$transaction(async (tx) => {
        const row = await upsertEconomyUserInTx(tx, discordId);
        assertWebGambleAllowed(row, bet);
        const now = Date.now();

        let bj = parseWebBlackjackState(row.webBlackjackState);
        if (bj && now - bj.createdAt > WEB_BJ_SESSION_TTL_MS) {
          await tx.economyUser.update({
            where: { discordUserId: discordId },
            data: { webBlackjackState: Prisma.DbNull },
          });
          bj = null;
        } else if (bj) {
          throw new Error("OTHER_GAME");
        }

        let existing = parseWebMinesState(row.webMinesState);
        if (existing && now - existing.createdAt > WEB_MINES_SESSION_TTL_MS) {
          await tx.economyUser.update({
            where: { discordUserId: discordId },
            data: { webMinesState: Prisma.DbNull },
          });
          existing = null;
        } else if (existing) {
          throw new Error("MINES_ACTIVE");
        }

        await assertWebGambleCooldown(tx, discordId, WEB_MINES_GAME_KEY);

        const mines = webMinesPlaceMines();
        const stored: WebMinesStoredState = {
          bet: bet.toString(),
          mines,
          safeRevealed: [],
          createdAt: now,
        };

        await tx.economyUser.update({
          where: { discordUserId: discordId },
          data: {
            webMinesState: serializeWebMinesState(
              stored,
            ) as Prisma.InputJsonValue,
          },
        });

        const bal = await balancesPayload(tx, discordId, row.cash);
        return playingResponse(stored, bet, bal);
      });

      return NextResponse.json(result);
    }

    /* pick | cashout */
    const result = await db.$transaction(async (tx) => {
      const row = await tx.economyUser.findUnique({
        where: { discordUserId: discordId },
      });
      if (!row) throw new Error("NOUSER");

      const state = parseWebMinesState(row.webMinesState);
      if (!state) throw new Error("NO_ROUND");

      const now = Date.now();
      if (now - state.createdAt > WEB_MINES_SESSION_TTL_MS) {
        await tx.economyUser.update({
          where: { discordUserId: discordId },
          data: { webMinesState: Prisma.DbNull },
        });
        throw new Error("ROUND_EXPIRED");
      }

      const bet = BigInt(state.bet);
      assertWebGambleAllowed(row, bet);
      const mineSet = new Set(state.mines);
      const mc = WEB_MINES_MULT_CENTS;

      const settleAndClear = async (payout: bigint) => {
        const fresh = await tx.economyUser.findUnique({
          where: { discordUserId: discordId },
        });
        if (!fresh) throw new Error("NOUSER");
        const { newCash } = await applyGambleOutcomeInTx(tx, fresh, {
          userId: discordId,
          bet,
          payout,
          game: WEB_MINES_GAME_KEY,
        });
        await tx.economyUser.update({
          where: { discordUserId: discordId },
          data: { webMinesState: Prisma.DbNull },
        });
        return newCash;
      };

      if (action === "cashout") {
        const gems = state.safeRevealed.length;
        if (gems < 1) {
          throw new Error("CASHOUT_NEED_GEM");
        }

        const payout = webMinesPayout(bet, gems, mc);
        const newCash = await settleAndClear(payout);
        const bal = await balancesPayload(tx, discordId, newCash);
        return {
          ok: true as const,
          phase: "done" as const,
          outcome: "cashout" as const,
          mines: state.mines,
          safeRevealed: state.safeRevealed,
          gems,
          betFormatted: formatCash(bet),
          net: (payout - bet).toString(),
          payout: payout.toString(),
          multiplier: (webMinesPayoutBps(gems) / 10000).toFixed(2),
          ...bal,
        };
      }

      /* pick */
      const idx = pickIndex!;
      if (state.safeRevealed.includes(idx)) {
        const bal = await balancesPayload(tx, discordId, row.cash);
        return playingResponse(state, bet, bal);
      }

      if (mineSet.has(idx)) {
        const newCash = await settleAndClear(BigInt(0));
        const bal = await balancesPayload(tx, discordId, newCash);
        return {
          ok: true as const,
          phase: "done" as const,
          outcome: "bomb" as const,
          hitIndex: idx,
          mines: state.mines,
          safeRevealed: state.safeRevealed,
          gems: state.safeRevealed.length,
          betFormatted: formatCash(bet),
          net: (-bet).toString(),
          payout: "0",
          ...bal,
        };
      }

      const safeRevealed = [...state.safeRevealed, idx];
      const gems = safeRevealed.length;

      if (gems >= WEB_MINES_SAFE) {
        const payout = webMinesPayout(bet, gems, mc);
        const newCash = await settleAndClear(payout);
        const bal = await balancesPayload(tx, discordId, newCash);
        return {
          ok: true as const,
          phase: "done" as const,
          outcome: "cleared" as const,
          mines: state.mines,
          safeRevealed,
          gems,
          betFormatted: formatCash(bet),
          net: (payout - bet).toString(),
          payout: payout.toString(),
          multiplier: (webMinesPayoutBps(gems) / 10000).toFixed(2),
          ...bal,
        };
      }

      const next: WebMinesStoredState = {
        ...state,
        safeRevealed,
        createdAt: state.createdAt,
      };
      await tx.economyUser.update({
        where: { discordUserId: discordId },
        data: {
          webMinesState: serializeWebMinesState(next) as Prisma.InputJsonValue,
        },
      });
      const bal = await balancesPayload(tx, discordId, row.cash);
      return playingResponse(next, bet, bal);
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "CASHOUT_NEED_GEM") {
      return jsonError("Reveal at least one safe tile before cashing out", 400);
    }
    if (msg === "OTHER_GAME") {
      return jsonError("Finish your Blackjack hand first (or wait for it to expire)", 409);
    }
    if (msg === "MINES_ACTIVE") {
      return jsonError("You already have a Mines round — keep playing or wait for it to expire", 409);
    }
    if (msg === "NO_ROUND") {
      return jsonError("No active round — start with a bet", 400);
    }
    if (msg === "ROUND_EXPIRED") {
      return jsonError("That round expired — start again", 400);
    }
    if (msg === "NOUSER") {
      return jsonError("Account not found", 400);
    }
    return nextResponseForWebGambleError(e, "[arivix-cash/mines]");
  }
}
