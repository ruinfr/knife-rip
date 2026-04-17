import { auth } from "@/auth";
import { applyGambleOutcomeInTx } from "@/lib/economy/gamble-outcome-tx";
import { WEB_ROULETTE_GAME_KEY } from "@/lib/economy/arivix-cash-web";
import { formatCash, parsePositiveBigInt } from "@/lib/economy/money";
import {
  assertWebGambleAllowed,
  assertWebGambleCooldown,
  upsertEconomyUserInTx,
} from "@/lib/economy/web-gamble-precheck";
import { nextResponseForWebGambleError } from "@/lib/economy/web-gamble-http";
import { isRoulettePick } from "@/lib/economy/web-roulette-constants";
import {
  spinAmericanRouletteIndex,
  webRouletteSettle,
  WEB_ROULETTE_MULT_CENTS,
} from "@/lib/economy/web-roulette";
import { db } from "@/lib/db";
import { getDiscordAccountIdForUserId } from "@/lib/arivix-cash-session";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

  const betRaw =
    body &&
    typeof body === "object" &&
    "bet" in body &&
    typeof (body as { bet: unknown }).bet === "string"
      ? (body as { bet: string }).bet
      : null;

  const pickRaw =
    body &&
    typeof body === "object" &&
    "pick" in body
      ? (body as { pick: unknown }).pick
      : null;

  if (!betRaw) {
    return NextResponse.json({ error: "Missing bet" }, { status: 400 });
  }
  if (!isRoulettePick(pickRaw)) {
    return NextResponse.json(
      { error: 'Pick must be "red", "black", or "green"' },
      { status: 400 },
    );
  }

  const bet = parsePositiveBigInt(betRaw);
  if (bet === null) {
    return NextResponse.json({ error: "Invalid bet" }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const row = await upsertEconomyUserInTx(tx, discordId);
      assertWebGambleAllowed(row, bet);
      await assertWebGambleCooldown(tx, discordId, WEB_ROULETTE_GAME_KEY);

      const pocketIdx = spinAmericanRouletteIndex();
      const mc = WEB_ROULETTE_MULT_CENTS;
      const { payout, won, pocketLabel, ballColor } = webRouletteSettle(
        pickRaw,
        bet,
        pocketIdx,
        mc,
      );

      const { net, newCash } = await applyGambleOutcomeInTx(tx, row, {
        userId: discordId,
        bet,
        payout,
        game: WEB_ROULETTE_GAME_KEY,
      });

      const bankRow = await tx.economyUser.findUnique({
        where: { discordUserId: discordId },
        select: { bankCash: true },
      });
      const bankCash = bankRow?.bankCash ?? BigInt(0);
      const total = newCash + bankCash;

      return {
        pick: pickRaw,
        pocketIdx,
        pocketLabel,
        ballColor,
        won,
        payout,
        net,
        newCash,
        bankCash,
        total,
      };
    });

    return NextResponse.json({
      ok: true,
      pick: result.pick,
      pocketIdx: result.pocketIdx,
      pocketLabel: result.pocketLabel,
      ballColor: result.ballColor,
      won: result.won,
      payout: result.payout.toString(),
      net: result.net.toString(),
      cash: result.newCash.toString(),
      bankCash: result.bankCash.toString(),
      total: result.total.toString(),
      cashFormatted: formatCash(result.newCash),
      bankCashFormatted: formatCash(result.bankCash),
      totalFormatted: formatCash(result.total),
    });
  } catch (e) {
    return nextResponseForWebGambleError(e, "[arivix-cash/roulette]");
  }
}
