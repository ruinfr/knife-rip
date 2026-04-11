import { NextResponse } from "next/server";

export function nextResponseForWebGambleError(
  e: unknown,
  logPrefix: string,
): NextResponse {
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
  console.error(logPrefix, e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
