import { isDeveloperDiscordId } from "@/lib/bot-developers";
import {
  clearBootstrapOwnerRevocation,
  deleteDiscordPrivilege,
  isBotOwnerDiscordIdResolved,
  tryRevokeStaticBootstrapOwner,
  upsertDiscordPrivilege,
} from "@/lib/discord-privilege";
import { syncArivixRipDiscordRolesForDiscordUser } from "@/lib/sync-arivix-privilege-roles";
import { API } from "@/lib/safe-api-message";
import { DiscordPrivilegeKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type HandoutBody = {
  actorDiscordId: string;
  targetDiscordId: string;
  kind: "OWNER" | "PREMIUM";
  action: "add" | "remove";
};

function parseSnowflake(s: string): string | null {
  const t = s.trim();
  return /^\d{17,20}$/.test(t) ? t : null;
}

function authFailureResponse(
  expected: string | undefined,
  req: NextRequest,
): NextResponse | null {
  if (!expected) {
    return NextResponse.json(API.unavailable, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const expected = process.env.BOT_INTERNAL_SECRET;
  const authErr = authFailureResponse(expected, req);
  if (authErr) return authErr;

  let body: HandoutBody;
  try {
    body = (await req.json()) as HandoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actor = parseSnowflake(body.actorDiscordId ?? "");
  const target = parseSnowflake(body.targetDiscordId ?? "");
  const kindRaw = body.kind;
  const action = body.action;

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

  if (action !== "add" && action !== "remove") {
    return NextResponse.json(
      { error: "action must be add or remove" },
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

  const actorIsDev = isDeveloperDiscordId(actor);
  const targetIsOwnerPeer = await isBotOwnerDiscordIdResolved(target);

  if (!actorIsDev && targetIsOwnerPeer && target !== actor) {
    return NextResponse.json(
      {
        error:
          "Owners cannot change handouts for other owners — ask a Developer.",
      },
      { status: 403 },
    );
  }

  if (kindRaw === "OWNER" && !actorIsDev) {
    return NextResponse.json(
      {
        error:
          "Only a Developer can add or remove the owner role. Owners may still use premium handouts for non-owners (or themselves).",
      },
      { status: 403 },
    );
  }

  const kind =
    kindRaw === "OWNER"
      ? DiscordPrivilegeKind.OWNER
      : DiscordPrivilegeKind.PREMIUM;

  if (action === "add") {
    await upsertDiscordPrivilege({
      discordUserId: target,
      kind,
      grantedByDiscordId: actor,
    });
    if (kindRaw === "OWNER") {
      await clearBootstrapOwnerRevocation(target);
    }
    const roleSync = await syncArivixRipDiscordRolesForDiscordUser(target);
    return NextResponse.json({
      ok: true,
      targetDiscordId: target,
      kind: kindRaw,
      action: "add",
      roleSync,
    });
  }

  const removedFromDatabase = await deleteDiscordPrivilege({
    discordUserId: target,
    kind,
  });

  let bootstrapRevoke: "revoked" | "already_revoked" | "not_static" | null =
    null;
  if (kindRaw === "OWNER" && actorIsDev) {
    bootstrapRevoke = await tryRevokeStaticBootstrapOwner({
      discordUserId: target,
      revokedByDiscordId: actor,
    });
  }

  const revokedBootstrapOwner =
    kindRaw === "OWNER" && bootstrapRevoke === "revoked";
  const removed = removedFromDatabase || revokedBootstrapOwner;

  const roleSync = await syncArivixRipDiscordRolesForDiscordUser(target);

  return NextResponse.json({
    ok: true,
    targetDiscordId: target,
    kind: kindRaw,
    action: "remove",
    removed,
    removedFromDatabase,
    revokedBootstrapOwner,
    bootstrapRevoke: kindRaw === "OWNER" ? bootstrapRevoke : null,
    roleSync,
  });
}
