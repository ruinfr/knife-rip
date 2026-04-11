"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export function KnifeCashClient() {
  const [me, setMe] = useState<MeJson | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [lbTab, setLbTab] = useState<"balance" | "gamble">("balance");
  const [balanceRows, setBalanceRows] = useState<BalanceLbRow[]>([]);
  const [gambleRows, setGambleRows] = useState<GambleLbRow[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [bet, setBet] = useState("");
  const [playMsg, setPlayMsg] = useState<string | null>(null);
  const [playBusy, setPlayBusy] = useState(false);
  const [disclaimerBusy, setDisclaimerBusy] = useState(false);

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

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  async function acceptDisclaimer() {
    setDisclaimerBusy(true);
    try {
      const res = await fetch("/api/knife-cash/disclaimer", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setPlayMsg(j?.error ?? "Could not save");
        return;
      }
      await refreshMe();
    } finally {
      setDisclaimerBusy(false);
    }
  }

  async function playCoinflip() {
    setPlayMsg(null);
    setPlayBusy(true);
    try {
      const res = await fetch("/api/knife-cash/coinflip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet: bet.trim() }),
      });
      const j = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            won?: boolean;
            totalFormatted?: string;
            error?: string;
          }
        | null;
      if (!res.ok) {
        setPlayMsg(j?.error ?? "Request failed");
        return;
      }
      if (j?.ok && j.totalFormatted) {
        await refreshMe();
        void refreshLeaderboard();
        setPlayMsg(
          j.won
            ? `You won — payout to wallet. New total: ${j.totalFormatted}`
            : `House wins this flip. New total: ${j.totalFormatted}`,
        );
      }
    } finally {
      setPlayBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-accent-strong">
            Knife Cash
          </h1>
          <p className="mt-1 text-sm text-muted">
            Same global wallet as Discord — bets use wallet cash only.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-edge underline decoration-edge/40 underline-offset-2 hover:decoration-edge"
        >
          Back to dashboard
        </Link>
      </div>

      {meError ? (
        <Card
          padding="md"
          className="border-danger-border bg-danger-muted text-sm text-danger-foreground"
        >
          {meError}
        </Card>
      ) : null}

      {me ? (
        <Card padding="lg" elevated className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Your balances
          </p>
          <p className="text-sm text-muted">
            Wallet{" "}
            <span className="font-mono text-foreground">{me.cashFormatted}</span>
            {" · "}
            Bank{" "}
            <span className="font-mono text-foreground">
              {me.bankCashFormatted}
            </span>
            {" · "}
            Total{" "}
            <span className="font-mono text-foreground">{me.totalFormatted}</span>
          </p>
        </Card>
      ) : null}

      {!me?.disclaimerAccepted ? (
        <Card padding="lg" className="space-y-4 border-amber-500/25 bg-amber-500/[0.06]">
          <h2 className="font-display text-lg font-semibold text-amber-100/95">
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
          >
            {disclaimerBusy ? "Saving…" : "I understand — continue"}
          </Button>
        </Card>
      ) : (
        <Card padding="lg" elevated className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-accent-strong">
            Coin flip (2× on win)
          </h2>
          <p className="text-sm text-muted">
            Fair 50/50. Stake comes from wallet cash.{" "}
            <span className="text-foreground/80">12s cooldown</span> between
            flips on the web.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Bet (wallet)</span>
              <input
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Amount"
                className="min-w-[10rem] rounded-lg border border-white/[0.1] bg-black/25 px-3 py-2 font-mono text-sm text-foreground outline-none ring-edge/30 focus:ring-2"
              />
            </label>
            <Button
              type="button"
              onClick={() => void playCoinflip()}
              disabled={playBusy || !bet.trim()}
            >
              {playBusy ? "Flipping…" : "Flip"}
            </Button>
          </div>
          {playMsg ? (
            <p className="text-sm text-muted" role="status">
              {playMsg}
            </p>
          ) : null}
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={lbTab === "balance" ? "primary" : "secondary"}
            onClick={() => setLbTab("balance")}
          >
            Richest (wallet + bank)
          </Button>
          <Button
            type="button"
            variant={lbTab === "gamble" ? "primary" : "secondary"}
            onClick={() => setLbTab("gamble")}
          >
            Gamble stats
          </Button>
        </div>
        <Card padding="md" className="min-h-[8rem]">
          {lbLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : lbTab === "balance" ? (
            balanceRows.length === 0 ? (
              <p className="text-sm text-muted">No balances yet.</p>
            ) : (
              <ul className="space-y-2">
                {balanceRows.map((r, i) => (
                  <li
                    key={`${r.displayName}-${i}`}
                    className="flex items-center gap-3 text-sm"
                  >
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
                  </li>
                ))}
              </ul>
            )
          ) : gambleRows.length === 0 ? (
            <p className="text-sm text-muted">No recorded gambles yet.</p>
          ) : (
            <ul className="space-y-2">
              {gambleRows.map((r, i) => (
                <li
                  key={`${r.displayName}-${i}`}
                  className="flex items-center gap-3 text-sm"
                >
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
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </main>
  );
}
