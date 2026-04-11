"use client";

import { BankTransferPanel } from "@/components/knife-cash/bank-transfer-panel";
import { CasinoFloor } from "@/components/knife-cash/casino-floor";
import { GamesCasinoPanel } from "@/components/knife-cash/games-casino-panel";
import { RecentWinsTicker } from "@/components/knife-cash/recent-wins-ticker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type MeJson = {
  cash: string;
  bankCash: string;
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
    <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
      <motion.header
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        {...m}
        transition={{ ...sectionMotion.transition, delay: 0.02 }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-edge/35 bg-edge-muted/30"
              aria-hidden
            >
              <Icon icon="mdi:poker-chip" className="size-6 text-edge" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Knife Cash
              </h1>
              <p className="text-sm text-muted">
                One wallet with Discord · wallet cash only
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted/80">
            Short URLs: /gamble · /cash · /economy
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground transition-colors hover:border-edge/30 hover:bg-edge-muted/20"
        >
          <Icon icon="mdi:view-dashboard-outline" className="size-4 text-muted" aria-hidden />
          Dashboard
        </Link>
      </motion.header>

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
          <Card padding="lg" className="border-white/[0.06] bg-surface/40">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Balances
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">Wallet</dt>
                <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
                  {me.cashFormatted}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Bank</dt>
                <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
                  {me.bankCashFormatted}
                </dd>
              </div>
              <div className="sm:border-l sm:border-white/[0.06] sm:pl-4">
                <dt className="text-xs text-muted">Total</dt>
                <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-edge">
                  {me.totalFormatted}
                </dd>
              </div>
            </dl>
          </Card>
        </motion.div>
      ) : null}

      {!me?.disclaimerAccepted ? (
        <motion.div
          {...m}
          transition={{ ...sectionMotion.transition, delay: 0.1 }}
        >
          <Card padding="lg" className="space-y-4 border-edge/20 bg-edge-faint">
            <h2 className="font-display text-base font-semibold text-foreground">
              Before you play
            </h2>
            <ul className="space-y-2 text-sm leading-relaxed text-muted">
              <li>Virtual play money only — not real currency.</li>
              <li>Earn on Discord; bank counts on leaderboards.</li>
              <li>Wager only what you are okay losing.</li>
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
        </>
      )}

      <motion.section
        className="space-y-4"
        {...m}
        transition={{ ...sectionMotion.transition, delay: 0.12 }}
      >
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Leaderboards
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={lbTab === "balance" ? "primary" : "secondary"}
              onClick={() => setLbTab("balance")}
              className="gap-2"
            >
              <Icon icon="mdi:trophy-outline" className="size-4" aria-hidden />
              Richest
            </Button>
            <Button
              type="button"
              variant={lbTab === "gamble" ? "primary" : "secondary"}
              onClick={() => setLbTab("gamble")}
              className="gap-2"
            >
              <Icon icon="mdi:chart-timeline-variant" className="size-4" aria-hidden />
              Gamble stats
            </Button>
          </div>
        </div>
        <Card padding="md" className="min-h-[8rem] border-white/[0.06]">
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
        </div>

        {me ? (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <BankTransferPanel
              cash={me.cash}
              bankCash={me.bankCash}
              cashFormatted={me.cashFormatted}
              bankCashFormatted={me.bankCashFormatted}
              onTransferred={refreshAll}
            />
          </aside>
        ) : null}
      </div>
    </main>
  );
}
