import {
  getPublicTopCommandsThisMonth,
  utcMonthStart,
} from "@/lib/command-usage-insights";
import { NextResponse } from "next/server";

/** See changelog-latest route — Vercel packaging expects a lambda for these handlers. */
export const dynamic = "force-dynamic";

/**
 * Public aggregates only: top commands this month (UTC), counts by command name.
 * No guild or user identifiers.
 */
export async function GET() {
  try {
    const top = await getPublicTopCommandsThisMonth(5);
    if (top === null) {
      return NextResponse.json(
        { error: "unavailable", top: [] },
        { status: 503 },
      );
    }

    const month = utcMonthStart().toISOString().slice(0, 7);
    return NextResponse.json(
      {
        period: "month",
        monthUtc: month,
        top,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=900, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "unavailable", top: [] },
      { status: 503 },
    );
  }
}
