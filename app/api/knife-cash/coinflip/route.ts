import { auth } from "@/auth";
import { applyGambleOutcomeInTx } from "@/lib/economy/gamble-outcome-tx";
import {
  WEB_COINFLIP_GAME_KEY,
  WEB_GAMBLE_COOLDOWN_MS,
} from "@/lib/economy/knife-cash-web";
import { formatCash, parsePositiveBigInt } from "@/lib/economy/money";
import { db } from "@/lib/db";
import { getDiscordAccountIdForUserId } from "@/lib/knife-cash-session";
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";

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
  if (!betRaw) {
    return NextResponse.json({ error: "Missing bet" }, { status: 400 });
  }

  const bet = parsePositiveBigInt(betRaw);
  if (bet === null) {
    return NextResponse.json({ error: "Invalid bet" }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const row = await tx.economyUser.upsert({
        where: { discordUserId: discordId },
        create: { discordUserId: discordId },
        update: {},
      });
      if (!row.gambleDisclaimerAcceptedAt) {
        throw new Error("DISCLAIMER");
      }
      if (row.cash < bet) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      const last = await tx.economyGambleLog.findFirst({
        where: { discordUserId: discordId, game: WEB_COINFLIP_GAME_KEY },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (
        last &&
        Date.now() - last.createdAt.getTime() < WEB_GAMBLE_COOLDOWN_MS
      ) {
        throw new Error("COOLDOWN");
      }

      const won = randomInt(2) === 1;
      const payout = won ? bet * BigInt(2) : BigInt(0);

      const { net, newCash } = await applyGambleOutcomeInTx(tx, row, {
        userId: discordId,
        bet,
        payout,
        game: WEB_COINFLIP_GAME_KEY,
      });

      const bankRow = await tx.economyUser.findUnique({
        where: { discordUserId: discordId },
        select: { bankCash: true },
      });
      const bankCash = bankRow?.bankCash ?? BigInt(0);
      const total = newCash + bankCash;

      return {
        won,
        net,
        newCash,
        bankCash,
        total,
        payout,
      };
    });

    return NextResponse.json({
      ok: true,
      won: result.won,
      net: result.net.toString(),
      payout: result.payout.toString(),
      cash: result.newCash.toString(),
      bankCash: result.bankCash.toString(),
      total: result.total.toString(),
      cashFormatted: formatCash(result.newCash),
      bankCashFormatted: formatCash(result.bankCash),
      totalFormatted: formatCash(result.total),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "INSUFFICIENT_FUNDS") {
      return NextResponse.json(
        { error: "Insufficient wallet cash" },
        { status: 400 },
      );
    }
    if (msg === "DISCLAIMER") {
      return NextResponse.json(
        { error: "Accept the Knife Cash disclaimer first" },
        { status: 403 },
      );
    }
    if (msg === "COOLDOWN") {
      return NextResponse.json(
        { error: "Slow down — try again in a moment" },
        { status: 429 },
      );
    }
    console.error("[knife-cash/coinflip]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
