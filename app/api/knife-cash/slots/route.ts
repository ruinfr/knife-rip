import { auth } from "@/auth";
import { applyGambleOutcomeInTx } from "@/lib/economy/gamble-outcome-tx";
import {
  WEB_SLOTS_GAME_KEY,
} from "@/lib/economy/knife-cash-web";
import { formatCash, parsePositiveBigInt } from "@/lib/economy/money";
import {
  assertWebGambleAllowed,
  assertWebGambleCooldown,
  upsertEconomyUserInTx,
} from "@/lib/economy/web-gamble-precheck";
import { nextResponseForWebGambleError } from "@/lib/economy/web-gamble-http";
import {
  rollWebSlotSymbols,
  webSlotsPayout,
} from "@/lib/economy/web-house-settle";
import { db } from "@/lib/db";
import { getDiscordAccountIdForUserId } from "@/lib/knife-cash-session";
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
  if (!betRaw) {
    return NextResponse.json({ error: "Missing bet" }, { status: 400 });
  }

  const bet = parsePositiveBigInt(betRaw);
  if (bet === null) {
    return NextResponse.json({ error: "Invalid bet" }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const row = await upsertEconomyUserInTx(tx, discordId);
      assertWebGambleAllowed(row, bet);
      await assertWebGambleCooldown(tx, discordId, WEB_SLOTS_GAME_KEY);

      const [a, b, c] = rollWebSlotSymbols();
      const { payout, tier } = webSlotsPayout(a, b, c, bet);

      const { net, newCash } = await applyGambleOutcomeInTx(tx, row, {
        userId: discordId,
        bet,
        payout,
        game: WEB_SLOTS_GAME_KEY,
      });

      const bankRow = await tx.economyUser.findUnique({
        where: { discordUserId: discordId },
        select: { bankCash: true },
      });
      const bankCash = bankRow?.bankCash ?? BigInt(0);
      const total = newCash + bankCash;

      return {
        reels: [a, b, c] as [string, string, string],
        tier,
        net,
        newCash,
        bankCash,
        total,
        payout,
      };
    });

    return NextResponse.json({
      ok: true,
      reels: result.reels,
      tier: result.tier,
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
    return nextResponseForWebGambleError(e, "[knife-cash/slots]");
  }
}
