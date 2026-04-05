import {
  isBotOwnerDiscordIdResolved,
  upsertDiscordPrivilege,
} from "@/lib/discord-privilege";
import { DiscordPrivilegeKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type HandoutBody = {
  actorDiscordId: string;
  targetDiscordId: string;
  kind: "OWNER" | "PREMIUM";
};

function parseSnowflake(s: string): string | null {
  const t = s.trim();
  return /^\d{17,20}$/.test(t) ? t : null;
}

export async function POST(req: NextRequest) {
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

  let body: HandoutBody;
  try {
    body = (await req.json()) as HandoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actor = parseSnowflake(body.actorDiscordId ?? "");
  const target = parseSnowflake(body.targetDiscordId ?? "");
  const kindRaw = body.kind;

  if (!actor || !target) {
    return NextResponse.json(
      { error: "actorDiscordId and targetDiscordId must be Discord snowflakes" },
      { status: 400 },
    );
  }

  if (kindRaw !== "OWNER" && kindRaw !== "PREMIUM") {
    return NextResponse.json(
      { error: "kind must be OWNER or PREMIUM" },
      { status: 400 },
    );
  }

  const allowed = await isBotOwnerDiscordIdResolved(actor);
  if (!allowed) {
    return NextResponse.json(
      { error: "Actor is not a bot owner" },
      { status: 403 },
    );
  }

  const kind =
    kindRaw === "OWNER"
      ? DiscordPrivilegeKind.OWNER
      : DiscordPrivilegeKind.PREMIUM;

  await upsertDiscordPrivilege({
    discordUserId: target,
    kind,
    grantedByDiscordId: actor,
  });

  return NextResponse.json({
    ok: true,
    targetDiscordId: target,
    kind: kindRaw,
  });
}
