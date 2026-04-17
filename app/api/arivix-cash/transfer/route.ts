import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCash, parsePositiveBigInt } from "@/lib/economy/money";
import {
  webDepositToBankInTx,
  webWithdrawFromBankInTx,
} from "@/lib/economy/web-bank-transfer";
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

  const direction =
    body &&
    typeof body === "object" &&
    "direction" in body &&
    typeof (body as { direction: unknown }).direction === "string"
      ? (body as { direction: string }).direction
      : null;
  const amountRaw =
    body &&
    typeof body === "object" &&
    "amount" in body &&
    typeof (body as { amount: unknown }).amount === "string"
      ? (body as { amount: string }).amount
      : null;

  if (direction !== "deposit" && direction !== "withdraw") {
    return NextResponse.json(
      { error: 'Use direction "deposit" (to bank) or "withdraw" (to wallet)' },
      { status: 400 },
    );
  }
  if (!amountRaw) {
    return NextResponse.json({ error: "Missing amount" }, { status: 400 });
  }

  const amount = parsePositiveBigInt(amountRaw);
  if (!amount) {
    return NextResponse.json(
      { error: "Amount must be a positive whole number" },
      { status: 400 },
    );
  }

  const now = Date.now();
  const fc = formatCash;

  try {
    const result = await db.$transaction(async (tx) => {
      if (direction === "deposit") {
        return webDepositToBankInTx(tx, discordId, amount, now, fc);
      }
      return webWithdrawFromBankInTx(tx, discordId, amount, now, fc);
    });

    return NextResponse.json({
      ok: true,
      cash: result.cashAfter.toString(),
      bankCash: result.bankAfter.toString(),
      cashFormatted: result.cashFormatted,
      bankCashFormatted: result.bankCashFormatted,
      totalFormatted: result.totalFormatted,
      bankCapFormatted: formatCash(result.cap),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOUSER") {
      return NextResponse.json({ error: "Account not found" }, { status: 400 });
    }
    if (msg === "POOR") {
      return NextResponse.json(
        { error: "Not enough wallet cash" },
        { status: 400 },
      );
    }
    if (msg === "LOW") {
      return NextResponse.json(
        { error: "Not enough in bank" },
        { status: 400 },
      );
    }
    if (msg.startsWith("FULL:")) {
      const room = msg.slice(5);
      return NextResponse.json(
        {
          error: `Bank is nearly full — you can deposit at most ${formatCash(BigInt(room))} more (tier cap).`,
        },
        { status: 400 },
      );
    }
    console.error("[arivix-cash/transfer]", e);
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }
}
