import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getDiscordAccountIdForUserId } from "@/lib/knife-cash-session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
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

  const now = new Date();
  await db.economyUser.upsert({
    where: { discordUserId: discordId },
    create: { discordUserId: discordId, gambleDisclaimerAcceptedAt: now },
    update: { gambleDisclaimerAcceptedAt: now },
  });

  return NextResponse.json({ ok: true });
}
