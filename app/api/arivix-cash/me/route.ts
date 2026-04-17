import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCash } from "@/lib/economy/money";
import { getDiscordAccountIdForUserId } from "@/lib/arivix-cash-session";
import { NextResponse } from "next/server";

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

  const row = await db.economyUser.upsert({
    where: { discordUserId: discordId },
    create: { discordUserId: discordId },
    update: {},
    select: {
      cash: true,
      bankCash: true,
      gambleDisclaimerAcceptedAt: true,
    },
  });

  const total = row.cash + row.bankCash;

  return NextResponse.json({
    cash: row.cash.toString(),
    bankCash: row.bankCash.toString(),
    total: total.toString(),
    cashFormatted: formatCash(row.cash),
    bankCashFormatted: formatCash(row.bankCash),
    totalFormatted: formatCash(total),
    disclaimerAccepted: Boolean(row.gambleDisclaimerAcceptedAt),
  });
}
