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
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 sm:gap-12 sm:px-6 sm:py-14 lg:px-8">
      <header className="flex flex-col gap-6 border-b border-red-950/30 pb-7 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
        <div>
          <span
            className="mb-3 block h-1 w-10 rounded-full bg-gradient-to-r from-edge/70 via-edge/30 to-transparent"
            aria-hidden
          />
          <h1 className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-accent-strong sm:text-4xl">
            <Icon icon="mdi:heart-pulse" className="size-9 text-edge sm:size-11" aria-hidden />
            Status
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Knife service health and shard status. For command behavior, check Discord or{" "}
            <Link href="/commands" className="font-semibold text-edge hover:underline">
              /commands
            </Link>
            .
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon
              icon="mdi:magnify"
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Enter your Server ID"
              aria-label="Find a server by ID"
              className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/[0.08] bg-background/80 py-3 pl-11 pr-4 text-sm text-foreground outline-none ring-edge/25 motion-safe:transition focus:border-edge/35 focus:ring-2"
            />
          </div>
          <button
            type="button"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-surface/50 text-muted motion-safe:transition hover:border-white/[0.14] hover:bg-surface-elevated/40 hover:text-foreground"
            aria-label="Search"
            title="Search"
          >
            <Icon icon="mdi:arrow-right" className="size-6" aria-hidden />
          </button>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-2xl border border-white/[0.08] bg-surface/45">
            <Icon icon="mdi:access-point-network" className="size-5 text-edge" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-accent-strong">
              Shards
            </h2>
            <p className="text-sm text-muted">Live bot infrastructure overview.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            padding="md"
            surface="plain"
            className="border-white/[0.07] bg-[#0f0b0b]/70"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Database</p>
                <p className="mt-1 text-xs text-muted">Enabled</p>
              </div>
              <span className="size-2.5 shrink-0 rounded-full bg-success shadow-[0_0_12px_rgba(34,197,94,0.25)]" aria-hidden />
            </div>
          </Card>
          <Card
            padding="md"
            surface="plain"
            className="border-white/[0.07] bg-[#0f0b0b]/70"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Redis</p>
                <p className="mt-1 text-xs text-muted">Enabled</p>
              </div>
              <span className="size-2.5 shrink-0 rounded-full bg-success shadow-[0_0_12px_rgba(34,197,94,0.25)]" aria-hidden />
            </div>
          </Card>
          <Card
            padding="md"
            surface="plain"
            className="border-white/[0.07] bg-[#0f0b0b]/70"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Web</p>
                <p className="mt-1 text-xs text-muted">Operational</p>
              </div>
              <span className="size-2.5 shrink-0 rounded-full bg-success shadow-[0_0_12px_rgba(34,197,94,0.25)]" aria-hidden />
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Shards
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card
              key={i}
              padding="none"
              surface="plain"
              className="overflow-hidden border-white/[0.07] bg-[#0f0b0b]/70"
            >
              <div className="px-5 pb-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Shard {i}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <Icon icon="mdi:refresh" className="size-4 opacity-80" aria-hidden />
                      1m ago
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                    <span className="size-2 rounded-full bg-success" aria-hidden />
                    Operational
                  </span>
                </div>
              </div>
              <div className="border-t border-white/[0.06] px-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Uptime
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">8h</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Latency
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {(95 + (i * 7) % 24).toFixed(2)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Servers
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {(1650 + i * 23).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Users
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {(110_000 + i * 17_500).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card padding="lg" elevated className="border-white/[0.08] bg-surface/45">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Community insights
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Anonymized successful command runs across Knife (UTC calendar month:{" "}
          <span className="text-foreground/90">{monthLabel}</span>). Server names are never shown — command names and counts only.
        </p>
        {topCommands && topCommands.length > 0 ? (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-edge">
            {topCommands.map((row) => (
              <li key={row.commandKey}>
                <span className="font-medium text-foreground/90">.{row.commandKey}</span>
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
    </main>
  );
}
