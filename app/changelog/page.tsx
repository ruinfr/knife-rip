import { PageShell } from "@/components/page-shell";
import {
  CHANGELOG_ENTRIES,
  assertLatestChangelogMatchesCatalog,
  formatChangelogDateEst,
} from "@/lib/changelog";
import { COMMAND_CATALOG_VERSION } from "@/lib/commands";
import { Card } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What's new",
  description:
    "Arivix changelog — short release notes tied to bot and site updates.",
};

export const revalidate = 3600;

export default function ChangelogPage() {
  assertLatestChangelogMatchesCatalog();

  return (
    <PageShell
      title="What's new"
      description={`Release notes for Arivix (command catalog v${COMMAND_CATALOG_VERSION}). Newest first.`}
      maxWidth="wide"
    >
      <ul className="!mt-0 list-none space-y-6 p-0">
        {CHANGELOG_ENTRIES.map((entry) => (
          <li key={entry.id}>
            <Card
              padding="lg"
              elevated
              className="scroll-mt-24"
              id={entry.id}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-lg font-semibold text-accent-strong">
                  {entry.title}
                </h2>
                <span className="text-xs font-medium text-muted">
                  <time dateTime={entry.date}>
                    {formatChangelogDateEst(entry.date)}
                  </time>
                  <span className="opacity-80"> · US Eastern</span>
                  {entry.catalogVersion != null
                    ? ` · catalog v${entry.catalogVersion}`
                    : ""}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {entry.summary}
              </p>
              {entry.bullets && entry.bullets.length > 0 ? (
                <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-edge/95">
                  {entry.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
