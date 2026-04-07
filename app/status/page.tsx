import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  formatUtcMonthLabel,
  getPublicTopCommandsThisMonth,
} from "@/lib/command-usage-insights";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Status",
  description: "knife.rip and Knife bot service status.",
};

export const revalidate = 900;

export default async function StatusPage() {
  const topCommands = await getPublicTopCommandsThisMonth(5);
  const monthLabel = formatUtcMonthLabel();

  return (
    <PageShell
      title="Status"
      description="Current health of the marketing site, dashboard, and APIs. For command behavior, check Discord or the Commands page."
    >
      <Card
        padding="lg"
        elevated
        className="border-success-border bg-success-muted"
      >
        <p className="flex items-center gap-2 font-medium text-success">
          <Icon
            icon="mdi:check-decagram"
            aria-hidden
            className="size-5 shrink-0"
          />
          All systems operational
        </p>
        <p className="mt-2 text-sm text-muted">
          Website, authentication, and billing endpoints are up. If you hit an
          error, try again in a minute or contact{" "}
          <a
            href="mailto:support@knife.rip"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            support@knife.rip
          </a>
          .
        </p>
      </Card>

      <Card padding="lg" elevated>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Community insights
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Anonymized successful command runs across Knife (UTC calendar month:{" "}
          <span className="text-foreground/90">{monthLabel}</span>). Server
          names are never shown — command names and counts only.
        </p>
        {topCommands && topCommands.length > 0 ? (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-edge">
            {topCommands.map((row) => (
              <li key={row.commandKey}>
                <span className="font-medium text-foreground/90">
                  .{row.commandKey}
                </span>
                <span className="text-muted"> — </span>
                <span className="tabular-nums text-muted">
                  {row.count.toLocaleString()} runs
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-muted">
            {topCommands === null
              ? "Usage insights are temporarily unavailable."
              : "No usage logged for this month yet — check back after the bot has been active."}
          </p>
        )}
      </Card>

      <p className="text-sm text-muted">
        Command reference:{" "}
        <Link href="/commands" className="font-medium text-edge hover:underline">
          /commands
        </Link>
      </p>
    </PageShell>
  );
}
