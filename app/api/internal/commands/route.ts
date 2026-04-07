import { COMMAND_CATALOG_VERSION, COMMAND_SNAPSHOT_ID } from "@/lib/commands";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 120_000;

function isValidCatalog(body: unknown): body is {
  version: number;
  categories: Array<{
    id: string;
    title: string;
    description: string;
    commands: Array<{
      name: string;
      description: string;
      usage?: string;
      tier?: string;
      style?: string;
      aliases?: string[];
      developerOnly?: boolean;
    }>;
  }>;
} {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  if (typeof o.version !== "number" || !Number.isFinite(o.version)) return false;
  if (!Array.isArray(o.categories)) return false;
  for (const cat of o.categories) {
    if (!cat || typeof cat !== "object") return false;
    const c = cat as Record<string, unknown>;
    if (typeof c.id !== "string" || !c.id.trim()) return false;
    if (typeof c.title !== "string") return false;
    if (typeof c.description !== "string") return false;
    if (!Array.isArray(c.commands)) return false;
    for (const cmd of c.commands) {
      if (!cmd || typeof cmd !== "object") return false;
      const m = cmd as Record<string, unknown>;
      if (typeof m.name !== "string" || !m.name.trim()) return false;
      if (typeof m.description !== "string") return false;
      if (m.usage != null && typeof m.usage !== "string") return false;
      if (
        m.tier != null &&
        m.tier !== "free" &&
        m.tier !== "pro"
      ) {
        return false;
      }
      if (
        m.style != null &&
        m.style !== "prefix" &&
        m.style !== "slash"
      ) {
        return false;
      }
      if (m.aliases != null) {
        if (!Array.isArray(m.aliases)) return false;
        for (const a of m.aliases) {
          if (typeof a !== "string" || !a.trim()) return false;
        }
      }
      if (m.developerOnly != null && typeof m.developerOnly !== "boolean") {
        return false;
      }
    }
  }
  return true;
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

  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Body too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidCatalog(body)) {
    return NextResponse.json(
      { error: "Invalid command catalog payload" },
      { status: 400 },
    );
  }

  if (body.version !== COMMAND_CATALOG_VERSION) {
    return NextResponse.json(
      {
        error: `Unsupported catalog version (expected ${COMMAND_CATALOG_VERSION})`,
      },
      { status: 400 },
    );
  }

  const payload = {
    version: body.version,
    categories: body.categories,
    updated: new Date().toISOString(),
  };

  await db.botCommandSnapshot.upsert({
    where: { id: COMMAND_SNAPSHOT_ID },
    create: { id: COMMAND_SNAPSHOT_ID, payload },
    update: { payload },
  });

  return NextResponse.json({ ok: true });
}
