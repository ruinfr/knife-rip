import { auth } from "@/auth";
import { applyGambleOutcomeInTx } from "@/lib/economy/gamble-outcome-tx";
import { WEB_BLACKJACK_GAME_KEY } from "@/lib/economy/knife-cash-web";
import { formatCash, parsePositiveBigInt } from "@/lib/economy/money";
import {
  blackjackHandValue,
  blackjackIsNatural,
  blackjackNaturalPayout,
  blackjackPlayDealer,
  blackjackWinPayout,
  drawBlackjackCard,
  parseWebBlackjackState,
  serializeWebBlackjackState,
  WEB_BJ_MULT_CENTS,
  WEB_BJ_SESSION_TTL_MS,
  type BJCard,
} from "@/lib/economy/web-blackjack";
import {
  assertWebGambleAllowed,
  assertWebGambleCooldown,
  upsertEconomyUserInTx,
} from "@/lib/economy/web-gamble-precheck";
import { nextResponseForWebGambleError } from "@/lib/economy/web-gamble-http";
import { db } from "@/lib/db";
import { getDiscordAccountIdForUserId } from "@/lib/knife-cash-session";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
      webBlackjackState: true,
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

  const state = parseWebBlackjackState(row.webBlackjackState);
  if (!state) {
    return NextResponse.json({ active: false, ...bal });
  }

  const now = Date.now();
  if (now - state.createdAt > WEB_BJ_SESSION_TTL_MS) {
    await db.economyUser.update({
      where: { discordUserId: discordId },
      data: { webBlackjackState: Prisma.DbNull },
    });
    return NextResponse.json({ active: false, ...bal });
  }

  return NextResponse.json({
    active: true,
    ok: true,
    phase: "playing" as const,
    player: cardsToJson(state.player),
    dealerVisible: cardsToJson([state.dealer[0]!]),
    dealerHole: true,
    playerValue: blackjackHandValue(state.player),
    bet: state.bet,
    betFormatted: formatCash(BigInt(state.bet)),
    ...bal,
  });
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function cardsToJson(c: BJCard[]): { rank: string }[] {
  return c.map((x) => ({ rank: x.rank }));
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

  if (action !== "deal" && action !== "hit" && action !== "stand") {
    return jsonError('Use action "deal", "hit", or "stand"', 400);
  }

  const betRaw =
    body &&
    typeof body === "object" &&
    "bet" in body &&
    typeof (body as { bet: unknown }).bet === "string"
      ? (body as { bet: string }).bet
      : null;

  try {
    if (action === "deal") {
      if (!betRaw) return jsonError("Missing bet", 400);
      const bet = parsePositiveBigInt(betRaw);
      if (bet === null) return jsonError("Invalid bet", 400);

      const result = await db.$transaction(async (tx) => {
        const row = await upsertEconomyUserInTx(tx, discordId);
        assertWebGambleAllowed(row, bet);

        let existing = parseWebBlackjackState(row.webBlackjackState);
        const now = Date.now();
        if (existing && now - existing.createdAt > WEB_BJ_SESSION_TTL_MS) {
          await tx.economyUser.update({
            where: { discordUserId: discordId },
            data: { webBlackjackState: Prisma.DbNull },
          });
          existing = null;
        } else if (existing) {
          throw new Error("HAND_ACTIVE");
        }

        await assertWebGambleCooldown(tx, discordId, WEB_BLACKJACK_GAME_KEY);

        const player: BJCard[] = [drawBlackjackCard(), drawBlackjackCard()];
        const dealer: BJCard[] = [drawBlackjackCard(), drawBlackjackCard()];
        const mc = WEB_BJ_MULT_CENTS;
        const pNat = blackjackIsNatural(player);
        const dNat = blackjackIsNatural(dealer);

        const settleAndClear = async (payout: bigint) => {
          const fresh = await tx.economyUser.findUnique({
            where: { discordUserId: discordId },
          });
          if (!fresh) throw new Error("NOUSER");
          const { newCash } = await applyGambleOutcomeInTx(tx, fresh, {
            userId: discordId,
            bet,
            payout,
            game: WEB_BLACKJACK_GAME_KEY,
          });
          await tx.economyUser.update({
            where: { discordUserId: discordId },
            data: { webBlackjackState: Prisma.DbNull },
          });
          return newCash;
        };

        if (pNat && dNat) {
          const newCash = await settleAndClear(bet);
          const bal = await balancesPayload(tx, discordId, newCash);
          return {
            phase: "done" as const,
            outcome: "push_blackjack" as const,
            player: cardsToJson(player),
            dealer: cardsToJson(dealer),
            playerValue: 21,
            dealerValue: 21,
            net: "0",
            payout: bet.toString(),
            ...bal,
          };
        }

        if (pNat && !dNat) {
          const pay = blackjackNaturalPayout(bet, mc);
          const newCash = await settleAndClear(pay);
          const bal = await balancesPayload(tx, discordId, newCash);
          return {
            phase: "done" as const,
            outcome: "blackjack" as const,
            player: cardsToJson(player),
            dealer: cardsToJson(dealer),
            playerValue: 21,
            dealerValue: blackjackHandValue(dealer),
            net: (pay - bet).toString(),
            payout: pay.toString(),
            ...bal,
          };
        }

        if (!pNat && dNat) {
          const newCash = await settleAndClear(BigInt(0));
          const bal = await balancesPayload(tx, discordId, newCash);
          return {
            phase: "done" as const,
            outcome: "dealer_blackjack" as const,
            player: cardsToJson(player),
            dealer: cardsToJson(dealer),
            playerValue: blackjackHandValue(player),
            dealerValue: 21,
            net: (-bet).toString(),
            payout: "0",
            ...bal,
          };
        }

        const stored = {
          bet: bet.toString(),
          player,
          dealer,
          phase: "player" as const,
          createdAt: now,
        };
        await tx.economyUser.update({
          where: { discordUserId: discordId },
          data: {
            webBlackjackState: serializeWebBlackjackState(
              stored,
            ) as Prisma.InputJsonValue,
          },
        });

        const bal = await balancesPayload(tx, discordId, row.cash);
        return {
          phase: "playing" as const,
          player: cardsToJson(player),
          dealerVisible: cardsToJson([dealer[0]!]),
          dealerHole: true,
          playerValue: blackjackHandValue(player),
          bet: bet.toString(),
          betFormatted: formatCash(bet),
          ...bal,
        };
      });

      return NextResponse.json({ ok: true, ...result });
    }

    /* hit | stand */
    const result = await db.$transaction(async (tx) => {
      const row = await tx.economyUser.findUnique({
        where: { discordUserId: discordId },
      });
      if (!row) throw new Error("NOUSER");

      const state = parseWebBlackjackState(row.webBlackjackState);
      if (!state) throw new Error("NO_HAND");

      const now = Date.now();
      if (now - state.createdAt > WEB_BJ_SESSION_TTL_MS) {
        await tx.economyUser.update({
          where: { discordUserId: discordId },
          data: { webBlackjackState: Prisma.DbNull },
        });
        throw new Error("HAND_EXPIRED");
      }

      const bet = BigInt(state.bet);
      assertWebGambleAllowed(row, bet);

      const mc = WEB_BJ_MULT_CENTS;

      const settleAndClear = async (payout: bigint) => {
        const fresh = await tx.economyUser.findUnique({
          where: { discordUserId: discordId },
        });
        if (!fresh) throw new Error("NOUSER");
        const { newCash } = await applyGambleOutcomeInTx(tx, fresh, {
          userId: discordId,
          bet,
          payout,
          game: WEB_BLACKJACK_GAME_KEY,
        });
        await tx.economyUser.update({
          where: { discordUserId: discordId },
          data: { webBlackjackState: Prisma.DbNull },
        });
        return newCash;
      };

      if (action === "hit") {
        const player = [...state.player, drawBlackjackCard()];
        const pv = blackjackHandValue(player);
        if (pv > 21) {
          const newCash = await settleAndClear(BigInt(0));
          const bal = await balancesPayload(tx, discordId, newCash);
          return {
            phase: "done" as const,
            outcome: "bust" as const,
            player: cardsToJson(player),
            dealer: cardsToJson(state.dealer),
            dealerHole: false,
            playerValue: pv,
            dealerValue: blackjackHandValue(state.dealer),
            net: (-bet).toString(),
            payout: "0",
            ...bal,
          };
        }

        const nextStored = {
          ...state,
          player,
          createdAt: state.createdAt,
        };
        await tx.economyUser.update({
          where: { discordUserId: discordId },
          data: {
            webBlackjackState: serializeWebBlackjackState(
              nextStored,
            ) as Prisma.InputJsonValue,
          },
        });
        const bal = await balancesPayload(tx, discordId, row.cash);
        return {
          phase: "playing" as const,
          player: cardsToJson(player),
          dealerVisible: cardsToJson([state.dealer[0]!]),
          dealerHole: true,
          playerValue: pv,
          bet: bet.toString(),
          betFormatted: formatCash(bet),
          ...bal,
        };
      }

      /* stand */
      const dealer = blackjackPlayDealer(state.dealer);
      const pv = blackjackHandValue(state.player);
      const dv = blackjackHandValue(dealer);

      let payout = BigInt(0);
      let outcome: "win" | "lose" | "push" | "dealer_bust";

      if (dv > 21) {
        payout = blackjackWinPayout(bet, mc);
        outcome = "dealer_bust";
      } else if (pv > dv) {
        payout = blackjackWinPayout(bet, mc);
        outcome = "win";
      } else if (pv < dv) {
        payout = BigInt(0);
        outcome = "lose";
      } else {
        payout = bet;
        outcome = "push";
      }

      const newCash = await settleAndClear(payout);
      const bal = await balancesPayload(tx, discordId, newCash);
      return {
        phase: "done" as const,
        outcome,
        player: cardsToJson(state.player),
        dealer: cardsToJson(dealer),
        dealerHole: false,
        playerValue: pv,
        dealerValue: dv,
        net: (payout - bet).toString(),
        payout: payout.toString(),
        ...bal,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "HAND_ACTIVE") {
      return jsonError("You already have a hand — hit, stand, or wait for it to expire", 409);
    }
    if (msg === "NO_HAND") {
      return jsonError("No active hand — place a bet to deal", 400);
    }
    if (msg === "HAND_EXPIRED") {
      return jsonError("That hand expired — deal again", 400);
    }
    if (msg === "NOUSER") {
      return jsonError("Account not found", 400);
    }
    return nextResponseForWebGambleError(e, "[knife-cash/blackjack]");
  }
}
