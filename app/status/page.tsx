import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getBotStatusSnapshot } from "@/lib/bot-status";
import {
  formatUtcMonthLabel,
  getPublicTopCommandsThisMonth,
} from "@/lib/command-usage-insights";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Status",
  description: "arivix.org and Arivix bot service status.",
};

export const revalidate = 900;

function formatUptime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function StatusPage() {
  const [topCommands, statusMeta] = await Promise.all([
    getPublicTopCommandsThisMonth(5),
    getBotStatusSnapshot(),
  ]);
  const monthLabel = formatUtcMonthLabel();
  const snapshot = statusMeta.snapshot;
  const shards = snapshot?.shards ?? [];
  const totalGuilds = shards.reduce((n, s) => n + s.guilds, 0);
  const totalUsers = shards.reduce((n, s) => n + s.users, 0);
  const avgLatency =
    shards.length > 0
      ? Math.round((shards.reduce((n, s) => n + s.latencyMs, 0) / shards.length) * 100) /
        100
      : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 sm:gap-12 sm:px-6 sm:py-14 lg:px-8">
      <header className="flex flex-col gap-6 border-b border-blue-950/30 pb-7 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
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
            Arivix service health and shard status. For command behavior, check Discord or{" "}
            <Link href="/commands" className="font-semibold text-edge hover:underline">
              /commands
            </Link>
            .
          </p>
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
                <p className="text-sm font-semibold text-foreground">Shards</p>
                <p className="mt-1 text-xs text-muted">
                  {snapshot ? `${snapshot.shardCount} reporting` : "No live snapshot yet"}
                </p>
              </div>
              <span
                className="size-2.5 shrink-0 rounded-full bg-success shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                aria-hidden
              />
            </div>
          </Card>
          <Card
            padding="md"
            surface="plain"
            className="border-white/[0.07] bg-[#0f0b0b]/70"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Servers</p>
                <p className="mt-1 text-xs text-muted">
                  {totalGuilds.toLocaleString()} across all shards
                </p>
              </div>
              <span
                className="size-2.5 shrink-0 rounded-full bg-success shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                aria-hidden
              />
            </div>
          </Card>
          <Card
            padding="md"
            surface="plain"
            className="border-white/[0.07] bg-[#0f0b0b]/70"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Users</p>
                <p className="mt-1 text-xs text-muted">
                  {totalUsers.toLocaleString()} member slots cached
                </p>
              </div>
              <span
                className="size-2.5 shrink-0 rounded-full bg-success shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                aria-hidden
              />
            </div>
          </Card>
        </div>
        <p className="text-xs text-muted">
          {statusMeta.updatedAt
            ? `Last bot snapshot: ${statusMeta.updatedAt.toLocaleString()}`
            : "No bot snapshot has been synced yet."}
          {avgLatency != null ? ` · Avg latency: ${avgLatency.toFixed(2)}ms` : ""}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Shards
        </h2>
        {!snapshot || shards.length === 0 ? (
          <Card padding="lg" className="border-dashed border-white/[0.12] bg-surface/30">
            <p className="text-sm text-muted">
              Waiting for live shard telemetry from the bot. Once the bot is online
              with `BOT_INTERNAL_SECRET` configured, real shard counts and amounts
              appear here automatically.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shards.map((s) => (
            <Card
              key={s.id}
              padding="none"
              surface="plain"
              className="overflow-hidden border-white/[0.07] bg-[#0f0b0b]/70"
            >
              <div className="px-5 pb-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Shard {s.id}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <Icon icon="mdi:refresh" className="size-4 opacity-80" aria-hidden />
                      live snapshot
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
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatUptime(s.uptimeMs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Latency
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {s.latencyMs.toFixed(2)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Servers
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {s.guilds.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Users
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {s.users.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            ))}
          </div>
        )}
      </section>

      <Card padding="lg" elevated className="border-white/[0.08] bg-surface/45">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Community insights
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Anonymized successful command runs across Arivix (UTC calendar month:{" "}
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
