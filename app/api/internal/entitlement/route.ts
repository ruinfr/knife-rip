import { getEntitlementForDiscordUserId } from "@/lib/entitlement";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.BOT_INTERNAL_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "BOT_INTERNAL_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const discordUserId = req.nextUrl.searchParams.get("discord_user_id");
  if (!discordUserId) {
    return NextResponse.json(
      { error: "Missing discord_user_id query parameter" },
      { status: 400 },
    );
  }

  const { premium, owner } =
    await getEntitlementForDiscordUserId(discordUserId);
  return NextResponse.json({ premium, owner, discordUserId });
}
