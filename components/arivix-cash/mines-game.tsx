"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { webGambleCooldownLabel } from "@/lib/economy/arivix-cash-recent-wins";
import { formatCash } from "@/lib/economy/money";
import {
  WEB_MINES_COUNT,
  WEB_MINES_SAFE,
  WEB_MINES_TOTAL,
} from "@/lib/economy/web-mines-constants";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

type PlayingJson = {
  ok: true;
  phase: "playing";
  safeRevealed: number[];
  gems: number;
  safeRemaining: number;
  multiplier: string;
  betFormatted: string;
  cashoutFormatted: string | null;
  cashFormatted: string;
  bankCashFormatted: string;
  totalFormatted: string;
};

type DoneJson = {
  ok: true;
  phase: "done";
  outcome: "bomb" | "cashout" | "cleared";
  mines: number[];
  safeRevealed: number[];
  gems: number;
  hitIndex?: number;
  betFormatted: string;
  net: string;
  payout: string;
  multiplier?: string;
  cashFormatted: string;
  bankCashFormatted: string;
  totalFormatted: string;
};

function Tile({
  index,
  mode,
  hitIndex,
  disabled,
  onPick,
  reduce,
}: {
  index: number;
  mode: "hidden" | "gem" | "mine";
  hitIndex?: number;
  disabled: boolean;
  onPick: (i: number) => void;
  reduce: boolean;
}) {
  const isHit = hitIndex === index;

  return (
    <motion.button
      type="button"
      disabled={disabled || mode !== "hidden"}
      onClick={() => onPick(index)}
      className={cn(
        "relative aspect-square min-h-[3.25rem] rounded-lg border-2 text-lg font-bold transition-shadow sm:min-h-[3.75rem]",
        mode === "hidden" &&
          "border-slate-500/40 bg-gradient-to-br from-slate-800/90 to-slate-950 shadow-inner hover:border-emerald-400/50 hover:shadow-[0_0_20px_-4px_rgba(52,211,153,0.35)]",
        mode === "gem" &&
          "border-emerald-400/50 bg-gradient-to-br from-emerald-600/35 via-emerald-900/50 to-black shadow-[0_0_24px_-6px_rgba(52,211,153,0.45)]",
        mode === "mine" &&
          "border-red-500/55 bg-gradient-to-br from-red-900/50 via-zinc-900 to-black",
        isHit && "ring-2 ring-red-400 ring-offset-2 ring-offset-zinc-950",
      )}
      initial={reduce ? undefined : { scale: 0.92, opacity: 0 }}
      animate={reduce ? undefined : { scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      whileTap={mode === "hidden" && !disabled ? { scale: 0.94 } : undefined}
    >
      {mode === "hidden" ? (
        <span className="flex h-full items-center justify-center text-slate-500/80">
          <Icon icon="mdi:help" className="size-6 sm:size-7" aria-hidden />
        </span>
      ) : mode === "gem" ? (
        <span className="flex h-full flex-col items-center justify-center gap-0.5 text-emerald-200">
          <span className="text-2xl sm:text-3xl" aria-hidden>
            💎
          </span>
        </span>
      ) : (
        <span className="flex h-full flex-col items-center justify-center text-red-200">
          <span className="text-2xl sm:text-3xl" aria-hidden>
            💣
          </span>
        </span>
      )}
    </motion.button>
  );
}

export function MinesGame({
  onBalancesUpdated,
}: {
  onBalancesUpdated: () => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [bet, setBet] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [playing, setPlaying] = useState<PlayingJson | null>(null);
  const [done, setDone] = useState<DoneJson | null>(null);

  const syncActive = useCallback(async () => {
    try {
      const res = await fetch("/api/arivix-cash/mines", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { active?: boolean } & Partial<PlayingJson>;
      if (j.active && j.phase === "playing" && j.safeRevealed && j.gems != null) {
        setPlaying({
          ok: true,
          phase: "playing",
          safeRevealed: j.safeRevealed,
          gems: j.gems,
          safeRemaining: j.safeRemaining ?? WEB_MINES_SAFE - j.gems,
          multiplier: j.multiplier ?? "—",
          betFormatted: j.betFormatted ?? "",
          cashoutFormatted: j.cashoutFormatted ?? null,
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
    async (action: "start" | "pick" | "cashout", index?: number) => {
      setMsg(null);
      setBusy(true);
      try {
        const res = await fetch("/api/arivix-cash/mines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "start"
              ? { action, bet: bet.trim() }
              : action === "pick"
                ? { action, index }
                : { action },
          ),
        });
        const data = (await res.json()) as
          | PlayingJson
          | DoneJson
          | { error?: string };

        if (!res.ok) {
          setMsg((data as { error?: string }).error ?? "Request failed");
          return;
        }

        if (!("ok" in data) || !data.ok) return;

        if (data.phase === "done") {
          setDone(data as DoneJson);
          setPlaying(null);
          await onBalancesUpdated();
        } else {
          setPlaying(data as PlayingJson);
          setDone(null);
        }
      } catch {
        setMsg("Network error");
      } finally {
        setBusy(false);
      }
    },
    [bet, onBalancesUpdated],
  );

  const tileMode = (i: number): "hidden" | "gem" | "mine" => {
    if (done) {
      const isMine = done.mines.includes(i);
      if (isMine) return "mine";
      if (done.safeRevealed.includes(i)) return "gem";
      return "hidden";
    }
    if (playing) {
      if (playing.safeRevealed.includes(i)) return "gem";
      return "hidden";
    }
    return "hidden";
  };

  const newRound = () => {
    setDone(null);
    setPlaying(null);
    setMsg(null);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-600/35",
        "bg-[radial-gradient(ellipse_100%_70%_at_50%_0%,rgba(30,41,59,0.85)_0%,rgba(15,23,42,0.97)_50%,#020617_100%)]",
        "shadow-[0_0_56px_-18px_rgba(100,116,139,0.35)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-18deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 6px)",
        }}
        aria-hidden
      />

      <div className="relative space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Mines
            </h2>
            <p className="mt-1 max-w-md text-xs text-slate-400">
              {WEB_MINES_TOTAL} tiles · {WEB_MINES_COUNT} bombs · {WEB_MINES_SAFE}{" "}
              gems. Each gem raises your cash-out multiplier. One bomb loses the
              stake. {webGambleCooldownLabel()} between new rounds.
            </p>
          </div>
          {(playing || done) && (
            <div className="rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2 text-right text-xs">
              <p className="text-slate-500">Bet</p>
              <p className="font-mono text-sm text-slate-100">
                {playing?.betFormatted ?? done?.betFormatted}
                {done && !playing ? (
                  <span className="text-slate-400">
                    {done.outcome === "bomb" ? " · lost" : " · paid"}
                  </span>
                ) : null}
              </p>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {(playing || done) && (
          <div className="flex flex-wrap gap-3 rounded-xl border border-emerald-500/15 bg-emerald-950/20 px-3 py-2 text-xs">
            <span className="text-emerald-100/80">
              Gems{" "}
              <strong className="font-mono text-emerald-200">
                {done ? done.gems : playing?.gems}
              </strong>
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-100/80">
              Multiplier{" "}
              <strong className="font-mono text-amber-200">
                {(() => {
                  const m = done?.multiplier ?? playing?.multiplier ?? "—";
                  return m === "—" ? m : `${m}×`;
                })()}
              </strong>
            </span>
            {playing?.cashoutFormatted ? (
              <>
                <span className="text-slate-500">·</span>
                <span className="text-emerald-100/80">
                  Cash out now{" "}
                  <strong className="font-mono text-emerald-300">
                    {playing.cashoutFormatted}
                  </strong>
                </span>
              </>
            ) : null}
          </div>
        )}

        {/* Grid */}
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 sm:gap-2.5">
          {Array.from({ length: WEB_MINES_TOTAL }, (_, i) => (
            <Tile
              key={i}
              index={i}
              mode={tileMode(i)}
              hitIndex={done?.hitIndex}
              disabled={busy || !!done || !playing}
              onPick={(idx) => void post("pick", idx)}
              reduce={Boolean(reduce)}
            />
          ))}
        </div>

        {!playing && !done && (
          <div className="flex flex-wrap items-end gap-3 border-t border-white/[0.06] pt-4">
            <label className="flex min-w-[9rem] flex-col gap-1.5 text-sm">
              <span className="text-slate-400">Bet</span>
              <input
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Wallet amount"
                disabled={busy}
                className="rounded-lg border border-white/[0.12] bg-black/50 px-3 py-2.5 font-mono text-sm text-white outline-none ring-slate-500/30 focus:ring-2 disabled:opacity-50"
              />
            </label>
            <Button
              type="button"
              variant="primary"
              disabled={busy || !bet.trim()}
              onClick={() => void post("start")}
              className="gap-2"
            >
              <Icon icon="mdi:grid" className="size-4" aria-hidden />
              Start round
            </Button>
          </div>
        )}

        {playing && (
          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
            <Button
              type="button"
              variant="primary"
              disabled={busy || !playing.cashoutFormatted}
              onClick={() => void post("cashout")}
              className="gap-2"
            >
              <Icon icon="mdi:cash-check" className="size-4" aria-hidden />
              Cash out
            </Button>
          </div>
        )}

        {done && (
          <motion.div
            className="space-y-3 border-t border-white/[0.06] pt-4"
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
          >
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-center",
                done.outcome === "bomb"
                  ? "border-red-500/35 bg-red-950/30 text-red-100"
                  : "border-emerald-500/35 bg-emerald-950/25 text-emerald-50",
              )}
            >
              <p className="font-display text-lg font-semibold">
                {done.outcome === "bomb"
                  ? "Mine hit"
                  : done.outcome === "cleared"
                    ? "Board cleared!"
                    : "Cashed out"}
              </p>
              <p className="mt-1 font-mono text-sm text-white/80">
                {done.outcome === "bomb"
                  ? `Stake lost · ${done.totalFormatted} total`
                  : `Net ${formatCash(BigInt(done.net))} · ${done.totalFormatted} total`}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={newRound} className="w-full">
              New round
            </Button>
          </motion.div>
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
