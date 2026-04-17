"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { webGambleCooldownLabel } from "@/lib/economy/arivix-cash-recent-wins";
import { formatCash } from "@/lib/economy/money";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const SUITS = ["♠", "♥", "♦", "♣"] as const;

type CardJson = { rank: string };

function displayRank(rank: string): string {
  if (rank === "10") return "10";
  return rank;
}

function PlayingCard({
  rank,
  faceDown,
  index,
  className,
}: {
  rank?: string;
  faceDown?: boolean;
  index: number;
  className?: string;
}) {
  const suit = SUITS[index % 4]!;
  const isRed = suit === "♥" || suit === "♦";

  if (faceDown) {
    return (
      <div
        className={cn(
          "flex h-[5.5rem] w-[4rem] shrink-0 items-center justify-center rounded-lg border-2 border-indigo-300/25 bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-950 shadow-lg sm:h-28 sm:w-[4.5rem]",
          "ring-1 ring-black/40",
          className,
        )}
      >
        <div
          className="h-[70%] w-[55%] rounded-md border border-white/10 opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.06) 3px, rgba(255,255,255,0.06) 4px)",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-[5.5rem] w-[4rem] shrink-0 flex-col rounded-lg border-2 border-white/40 bg-gradient-to-b from-white via-white to-zinc-100 shadow-lg sm:h-28 sm:w-[4.5rem]",
        isRed ? "text-red-600" : "text-zinc-900",
        className,
      )}
    >
      <div className="flex items-start justify-between px-1 pt-0.5 text-[10px] font-bold leading-none sm:text-xs">
        <span>{rank ? displayRank(rank) : ""}</span>
        <span className="text-sm sm:text-base">{suit}</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <span className="text-2xl sm:text-3xl">{suit}</span>
        <span className="text-[10px] font-bold opacity-80 sm:text-xs">
          {rank ? displayRank(rank) : ""}
        </span>
      </div>
    </div>
  );
}

type DonePayload = {
  phase: "done";
  outcome: string;
  player: CardJson[];
  dealer: CardJson[];
  dealerHole?: boolean;
  playerValue: number;
  dealerValue: number;
  net: string;
  payout: string;
  cashFormatted: string;
  bankCashFormatted: string;
  totalFormatted: string;
};

type PlayingPayload = {
  phase: "playing";
  player: CardJson[];
  dealerVisible: CardJson[];
  dealerHole: boolean;
  playerValue: number;
  betFormatted: string;
  cashFormatted: string;
  bankCashFormatted: string;
  totalFormatted: string;
};

export function BlackjackGame({
  onBalancesUpdated,
}: {
  onBalancesUpdated: () => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [bet, setBet] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [playing, setPlaying] = useState<PlayingPayload | null>(null);
  const [done, setDone] = useState<DonePayload | null>(null);

  const syncActive = useCallback(async () => {
    try {
      const res = await fetch("/api/arivix-cash/blackjack", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { active?: boolean } & Partial<PlayingPayload>;
      if (j.active && j.phase === "playing") {
        setPlaying({
          phase: "playing",
          player: j.player ?? [],
          dealerVisible: j.dealerVisible ?? [],
          dealerHole: j.dealerHole ?? true,
          playerValue: j.playerValue ?? 0,
          betFormatted: j.betFormatted ?? "",
          cashFormatted: j.cashFormatted ?? "",
          bankCashFormatted: j.bankCashFormatted ?? "",
          totalFormatted: j.totalFormatted ?? "",
        });
        setDone(null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void syncActive();
  }, [syncActive]);

  const post = useCallback(
    async (action: "deal" | "hit" | "stand", betAmount?: string) => {
      setMsg(null);
      setBusy(true);
      try {
        const res = await fetch("/api/arivix-cash/blackjack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "deal" ? { action, bet: betAmount } : { action },
          ),
        });
        const data = (await res.json()) as
          | ({ ok: true } & (DonePayload | PlayingPayload))
          | { error?: string };

        if (!res.ok) {
          setMsg(
            (data as { error?: string }).error ?? "Request failed",
          );
          return;
        }

        if (!("ok" in data) || !data.ok) return;

        if (data.phase === "done") {
          setDone(data);
          setPlaying(null);
          await onBalancesUpdated();
        } else {
          setPlaying(data);
          setDone(null);
        }
      } catch {
        setMsg("Network error");
      } finally {
        setBusy(false);
      }
    },
    [onBalancesUpdated],
  );

  const outcomeLabel = (o: string) => {
    switch (o) {
      case "blackjack":
        return "Blackjack!";
      case "dealer_blackjack":
        return "Dealer blackjack";
      case "push_blackjack":
        return "Push — both blackjack";
      case "bust":
        return "Bust";
      case "dealer_bust":
        return "Dealer busts — you win";
      case "win":
        return "You win";
      case "lose":
        return "House wins";
      case "push":
        return "Push";
      default:
        return o;
    }
  };

  const newHand = () => {
    setDone(null);
    setPlaying(null);
    setMsg(null);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-700/35 shadow-[0_0_48px_-16px_rgba(16,185,129,0.2)]",
        "bg-[radial-gradient(ellipse_120%_80%_at_50%_20%,rgba(6,78,59,0.55)_0%,rgba(6,24,18,0.95)_45%,#020806_100%)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)",
        }}
        aria-hidden
      />

      <div className="relative space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-base font-semibold text-emerald-50">
            Blackjack
          </h2>
          <p className="mt-1 text-xs text-emerald-100/65">
            Vegas rules on the felt — dealer hits to 17, natural pays 3:2.{" "}
            {webGambleCooldownLabel()} between new hands.
          </p>
        </div>

        {/* Dealer */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/50">
            Dealer
          </p>
          <div className="flex min-h-[5.5rem] flex-wrap items-end gap-2 sm:min-h-28">
            {done ? (
              done.dealer.map((c, i) => (
                <motion.div
                  key={`d-done-${i}`}
                  initial={reduce ? undefined : { opacity: 0, y: -8, rotateY: -90 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0, rotateY: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                >
                  <PlayingCard rank={c.rank} index={i} />
                </motion.div>
              ))
            ) : playing ? (
              <>
                <motion.div
                  initial={reduce ? undefined : { opacity: 0, scale: 0.92 }}
                  animate={reduce ? undefined : { opacity: 1, scale: 1 }}
                >
                  <PlayingCard
                    rank={playing.dealerVisible[0]?.rank}
                    index={0}
                  />
                </motion.div>
                {playing.dealerHole ? (
                  <PlayingCard faceDown index={1} />
                ) : playing.dealerVisible[1] ? (
                  <PlayingCard
                    rank={playing.dealerVisible[1]?.rank}
                    index={1}
                  />
                ) : null}
              </>
            ) : (
              <p className="text-sm text-emerald-100/40">—</p>
            )}
          </div>
          {done ? (
            <p className="mt-2 font-mono text-xs text-emerald-100/70">
              Total {done.dealerValue}
            </p>
          ) : null}
        </div>

        {/* Player */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-200/50">
            Your hand
          </p>
          <div className="flex flex-wrap items-end gap-2">
            {(playing?.player ?? done?.player ?? []).map((c, i) => (
              <motion.div
                key={`p-${i}-${c.rank}`}
                initial={reduce ? undefined : { opacity: 0, y: 12, rotateY: 90 }}
                animate={reduce ? undefined : { opacity: 1, y: 0, rotateY: 0 }}
                transition={{ delay: i * 0.07, duration: 0.38 }}
              >
                <PlayingCard rank={c.rank} index={i + 3} />
              </motion.div>
            ))}
          </div>
          {(playing || done) && (
            <p className="mt-2 font-mono text-sm font-semibold text-emerald-50">
              {playing ? playing.playerValue : done?.playerValue}{" "}
              {playing && (
                <span className="text-xs font-normal text-emerald-200/60">
                  · Bet {playing.betFormatted}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Controls */}
        {!playing && !done && (
          <div className="flex flex-wrap items-end gap-3 border-t border-white/[0.06] pt-4">
            <label className="flex min-w-[9rem] flex-col gap-1.5 text-sm">
              <span className="text-emerald-100/55">Bet</span>
              <input
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Wallet amount"
                disabled={busy}
                className="rounded-lg border border-white/[0.12] bg-black/45 px-3 py-2.5 font-mono text-sm text-white outline-none ring-emerald-500/30 focus:ring-2 disabled:opacity-50"
              />
            </label>
            <Button
              type="button"
              variant="primary"
              disabled={busy || !bet.trim()}
              onClick={() => void post("deal", bet.trim())}
              className="gap-2"
            >
              <Icon icon="mdi:cards-playing-outline" className="size-4" aria-hidden />
              Deal
            </Button>
          </div>
        )}

        {playing && (
          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => void post("hit")}
              className="gap-2"
            >
              <Icon icon="mdi:plus" className="size-4" aria-hidden />
              Hit
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void post("stand")}
              className="gap-2"
            >
              <Icon icon="mdi:hand-back-left-outline" className="size-4" aria-hidden />
              Stand
            </Button>
          </div>
        )}

        {done && (
          <div className="space-y-3 border-t border-white/[0.06] pt-4">
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-center",
                done.outcome === "lose" || done.outcome === "bust" || done.outcome === "dealer_blackjack"
                  ? "border-blue-500/30 bg-blue-950/35 text-red-100"
                  : done.outcome === "push" || done.outcome === "push_blackjack"
                    ? "border-amber-400/25 bg-amber-950/25 text-amber-100"
                    : "border-emerald-400/30 bg-emerald-950/35 text-emerald-50",
              )}
            >
              <p className="font-display text-lg font-semibold">
                {outcomeLabel(done.outcome)}
              </p>
              <p className="mt-1 font-mono text-sm text-white/80">
                Net {formatCash(BigInt(done.net))} · Total {done.totalFormatted}
              </p>
            </div>
            <Button type="button" variant="primary" onClick={newHand} className="w-full">
              New hand
            </Button>
          </div>
        )}

        {msg ? (
          <p className="text-sm text-red-200/90" role="alert">
            {msg}
          </p>
        ) : null}
      </div>
    </div>
  );
}
