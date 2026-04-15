import {
  changelogEntryAbsoluteUrl,
  formatChangelogDateEst,
  getLatestChangelogEntry,
} from "@/lib/changelog";
import { COMMAND_CATALOG_VERSION } from "@/lib/commands";
import { NextResponse } from "next/server";

/** Vercel build tracer needs a Node handler; ISR static routes can fail with "Unable to find lambda". */
export const dynamic = "force-dynamic";

/**
 * Latest changelog entry for .news, widgets, and RSS-style consumers.
 * No secrets; safe to cache at the edge.
 */
export async function GET() {
  try {
    const entry = getLatestChangelogEntry();
    const url = changelogEntryAbsoluteUrl(entry);
    return NextResponse.json(
      {
        title: entry.title,
        summary: entry.summary,
        url,
        date: entry.date,
        dateDisplay: `${formatChangelogDateEst(entry.date)} (US Eastern)`,
        catalogVersion:
          entry.catalogVersion ?? COMMAND_CATALOG_VERSION,
        id: entry.id,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "unavailable" },
      { status: 503 },
    );
  }
}
