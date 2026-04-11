"use client";

import { CasinoFloor } from "@/components/knife-cash/casino-floor";
import { GamesCasinoPanel } from "@/components/knife-cash/games-casino-panel";
import { RecentWinsTicker } from "@/components/knife-cash/recent-wins-ticker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type MeJson = {
  cashFormatted: string;
  bankCashFormatted: string;
  totalFormatted: string;
  disclaimerAccepted: boolean;
};

type BalanceLbRow = {
  displayName: string;
  avatarUrl: string | null;
  cashFormatted: string;
  bankCashFormatted: string;
  totalFormatted: string;
};

type GambleLbRow = {
  displayName: string;
  avatarUrl: string | null;
  wins: number;
  losses: number;
  netProfitFormatted: string;
  bestStreak: number;
};

const UPCOMING_GAMES: ReadonlyArray<{
  icon: string;
  title: string;
  subtitle: string;
}> = [
  {
    icon: "mdi:cards-playing-outline",
    title: "Blackjack",
    subtitle: "Full hand flow like Discord hub — next on web",
  },
  {
    icon: "mdi:grid",
    title: "Mines",
    subtitle: "Rainbet-style grid — same engine as Discord",
  },
  {
    icon: "mdi:bullseye",
    title: "Roulette",
    subtitle: "American wheel (red / black / green)",
  },
];

const sectionMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

export function KnifeCashClient() {
  const reduce = useReducedMotion();
  const [me, setMe] = useState<MeJson | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [lbTab, setLbTab] = useState<"balance" | "gamble">("balance");
  const [balanceRows, setBalanceRows] = useState<BalanceLbRow[]>([]);
  const [gambleRows, setGambleRows] = useState<GambleLbRow[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [disclaimerBusy, setDisclaimerBusy] = useState(false);
  const [disclaimerMsg, setDisclaimerMsg] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    setMeError(null);
    const res = await fetch("/api/knife-cash/me", { cache: "no-store" });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setMeError(j?.error ?? "Could not load balance");
      return;
    }
    const j = (await res.json()) as MeJson;
    setMe(j);
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const res = await fetch(
        `/api/knife-cash/leaderboard?tab=${lbTab}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const j = (await res.json()) as
        | { tab: "balance"; rows: BalanceLbRow[] }
        | { tab: "gamble"; rows: GambleLbRow[] };
      if (j.tab === "balance") setBalanceRows(j.rows);
      else setGambleRows(j.rows);
    } finally {
      setLbLoading(false);
    }
  }, [lbTab]);

  const refreshAll = useCallback(async () => {
    await refreshMe();
    void refreshLeaderboard();
  }, [refreshMe, refreshLeaderboard]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  async function acceptDisclaimer() {
    setDisclaimerMsg(null);
    setDisclaimerBusy(true);
    try {
      const res = await fetch("/api/knife-cash/disclaimer", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setDisclaimerMsg(j?.error ?? "Could not save");
        return;
      }
      await refreshMe();
    } finally {
      setDisclaimerBusy(false);
    }
  }

  const m = reduce ? {} : sectionMotion;

  return (
    <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <motion.div
        className="flex flex-wrap items-center justify-between gap-3"
        {...m}
        transition={{ ...sectionMotion.transition, delay: 0.02 }}
      >
        <div className="flex items-start gap-3">
          <motion.div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-edge/30 bg-edge-muted/40 shadow-[0_0_28px_-8px_rgba(220,38,38,0.35)]"
            initial={reduce ? undefined : { scale: 0.92, rotate: -8 }}
            animate={reduce ? undefined : { scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            <Icon
              icon="mdi:poker-chip"
              className="size-7 text-edge"
              aria-hidden
            />
          </motion.div>
          <div>
            <h1 className="font-display text-2xl font-bold text-accent-strong">
              Knife Cash
            </h1>
            <p className="mt-1 text-sm text-muted">
              Same global wallet as Discord — bets use wallet cash only.
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted/90">
              <Icon icon="mdi:link-variant" className="size-3.5" aria-hidden />
              <span>
                Also at{" "}
                <code className="rounded bg-black/30 px-1 py-px font-mono text-[10px] text-edge/90">
                  /gamble
                </code>
                ,{" "}
                <code className="rounded bg-black/30 px-1 py-px font-mono text-[10px] text-edge/90">
                  /cash
                </code>
                ,{" "}
                <code className="rounded bg-black/30 px-1 py-px font-mono text-[10px] text-edge/90">
                  /economy
                </code>
              </span>
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-edge underline decoration-edge/40 underline-offset-2 hover:decoration-edge"
        >
          <Icon icon="mdi:view-dashboard-outline" className="size-4" aria-hidden />
          Dashboard
        </Link>
      </motion.div>

      {meError ? (
        <motion.div {...m} transition={{ ...sectionMotion.transition, delay: 0.05 }}>
          <Card
            padding="md"
            className="border-danger-border bg-danger-muted text-sm text-danger-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <Icon icon="mdi:alert-circle-outline" className="size-5 shrink-0" />
              {meError}
            </span>
          </Card>
        </motion.div>
      ) : null}

      {me ? (
        <motion.div
          {...m}
          transition={{ ...sectionMotion.transition, delay: 0.08 }}
        >
          <Card padding="lg" elevated className="space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <Icon icon="mdi:wallet-outline" className="size-4 text-edge/80" />
              Your balances
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
              <span className="inline-flex items-center gap-2 text-sm text-muted">
                <Icon icon="mdi:cash" className="size-4 text-amber-200/90" />
                Wallet{" "}
                <span className="font-mono text-foreground">{me.cashFormatted}</span>
              </span>
              <span className="inline-flex items-center gap-2 text-sm text-muted">
                <Icon icon="mdi:bank-outline" className="size-4 text-sky-200/80" />
                Bank{" "}
                <span className="font-mono text-foreground">
                  {me.bankCashFormatted}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 text-sm text-muted">
                <Icon icon="mdi:sigma" className="size-4 text-edge/90" />
                Total{" "}
                <span className="font-mono text-edge">{me.totalFormatted}</span>
              </span>
            </div>
          </Card>
        </motion.div>
      ) : null}

      {!me?.disclaimerAccepted ? (
        <motion.div
          {...m}
          transition={{ ...sectionMotion.transition, delay: 0.1 }}
        >
          <Card padding="lg" className="space-y-4 border-amber-500/25 bg-amber-500/[0.06]">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-amber-100/95">
              <Icon icon="mdi:shield-alert-outline" className="size-6 shrink-0" />
              Knife Cash disclaimer
            </h2>
            <ul className="list-inside list-disc space-y-1.5 text-sm leading-relaxed text-muted">
              <li>Knife Cash is virtual play money for fun — not real currency.</li>
              <li>
                You can earn from milestones, dailies, jobs, and games on Discord;
                bank balances count toward leaderboards.
              </li>
              <li>Only wager what you are comfortable losing — play responsibly.</li>
            </ul>
            <Button
              type="button"
              onClick={() => void acceptDisclaimer()}
              disabled={disclaimerBusy}
              className="inline-flex items-center gap-2"
            >
              <Icon icon="mdi:check-decagram-outline" className="size-4" />
              {disclaimerBusy ? "Saving…" : "I understand — continue"}
            </Button>
            {disclaimerMsg ? (
              <p className="text-sm text-danger-foreground">{disclaimerMsg}</p>
            ) : null}
          </Card>
        </motion.div>
      ) : (
        <>
          <CasinoFloor>
            <RecentWinsTicker />
            <GamesCasinoPanel onBalancesUpdated={refreshAll} />
          </CasinoFloor>

          <motion.section
            className="space-y-3"
            {...m}
            transition={{ ...sectionMotion.transition, delay: 0.06 }}
          >
            <div className="flex items-center gap-2">
              <Icon icon="mdi:map-marker-path" className="size-5 text-muted" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Coming next
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              Table games and mines to match Discord + Rainbet-style originals. See{" "}
              <code className="rounded bg-black/25 px-1 font-mono text-[10px]">
                lib/economy/web-casino-roadmap.md
              </code>
              .
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {UPCOMING_GAMES.map((g) => (
                <li key={g.title}>
                  <div
                    className={cn(
                      "flex gap-3 rounded-xl border border-white/[0.06] bg-surface/40 px-3 py-3",
                      "opacity-80",
                    )}
                  >
                    <Icon
                      icon={g.icon}
                      className="mt-0.5 size-6 shrink-0 text-muted"
                      aria-hidden
                    />
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {g.title}
                        <span title="Coming soon">
                          <Icon
                            icon="mdi:lock-clock-outline"
                            className="size-3.5 text-muted"
                            aria-hidden
                          />
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{g.subtitle}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.section>
        </>
      )}

      <motion.section
        className="space-y-3"
        {...m}
        transition={{ ...sectionMotion.transition, delay: 0.12 }}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={lbTab === "balance" ? "primary" : "secondary"}
            onClick={() => setLbTab("balance")}
            className="inline-flex items-center gap-2"
          >
            <Icon icon="mdi:trophy-outline" className="size-4" />
            Richest
          </Button>
          <Button
            type="button"
            variant={lbTab === "gamble" ? "primary" : "secondary"}
            onClick={() => setLbTab("gamble")}
            className="inline-flex items-center gap-2"
          >
            <Icon icon="mdi:chart-timeline-variant" className="size-4" />
            Gamble stats
          </Button>
        </div>
        <Card padding="md" className="min-h-[8rem]">
          {lbLoading ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted">
              <Icon icon="mdi:autorenew" className="size-4 animate-spin" />
              Loading…
            </p>
          ) : lbTab === "balance" ? (
            balanceRows.length === 0 ? (
              <p className="text-sm text-muted">No balances yet.</p>
            ) : (
              <ul className="space-y-2">
                {balanceRows.map((r, i) => (
                  <motion.li
                    key={`${r.displayName}-${i}`}
                    initial={reduce ? undefined : { opacity: 0, x: -8 }}
                    animate={reduce ? undefined : { opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="flex w-5 justify-center font-mono text-xs text-muted">
                      {i + 1}
                    </span>
                    {r.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-surface-border text-xs text-muted">
                        ?
                      </div>
                    )}
                    <span className="flex-1 font-medium text-foreground">
                      {r.displayName}
                    </span>
                    <span className="hidden text-xs text-muted sm:inline">
                      {r.cashFormatted} + {r.bankCashFormatted}
                    </span>
                    <span className="font-mono text-edge">{r.totalFormatted}</span>
                  </motion.li>
                ))}
              </ul>
            )
          ) : gambleRows.length === 0 ? (
            <p className="text-sm text-muted">No recorded gambles yet.</p>
          ) : (
            <ul className="space-y-2">
              {gambleRows.map((r, i) => (
                <motion.li
                  key={`${r.displayName}-${i}`}
                  initial={reduce ? undefined : { opacity: 0, x: -8 }}
                  animate={reduce ? undefined : { opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="flex w-5 justify-center font-mono text-xs text-muted">
                    {i + 1}
                  </span>
                  {r.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-surface-border text-xs text-muted">
                      ?
                    </div>
                  )}
                  <span className="flex-1 font-medium text-foreground">
                    {r.displayName}
                  </span>
                  <span className="text-xs text-muted">
                    W {r.wins} / L {r.losses} · best {r.bestStreak}
                  </span>
                  <span className="font-mono text-edge">{r.netProfitFormatted}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
      </motion.section>
    </main>
  );
}
