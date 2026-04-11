"use client";

import { Icon } from "@/components/ui/icon";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

type WinRow = {
  game: string;
  player: string;
  profit: string;
  at: string;
};

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function RecentWinsTicker() {
  const reduce = useReducedMotion();
  const [wins, setWins] = useState<WinRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/knife-cash/recent-wins", {
        cache: "no-store",
      });
      if (!res.ok) {
        setErr("Could not load wins");
        return;
      }
      const j = (await res.json()) as { wins?: WinRow[] };
      setWins(j.wins ?? []);
      setErr(null);
    } catch {
      setErr("Could not load wins");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 45_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <section
      className="rounded-2xl border border-amber-500/15 bg-black/40 px-3 py-3 shadow-inner sm:px-4"
      aria-label="Recent wins"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-200/80">
          <Icon icon="mdi:fire" className="size-4 text-orange-400" />
          Recent wins
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-muted hover:border-amber-500/25 hover:text-foreground"
        >
          <Icon icon="mdi:refresh" className="size-3.5" />
          Refresh
        </button>
      </div>

      {err ? (
        <p className="text-xs text-muted">{err}</p>
      ) : wins.length === 0 ? (
        <p className="text-xs text-muted">
          No wins logged yet — be the first on the board.
        </p>
      ) : (
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5">
          {wins.map((w, i) => (
            <motion.div
              key={`${w.at}-${w.player}-${i}`}
              initial={reduce ? undefined : { opacity: 0, scale: 0.96 }}
              animate={reduce ? undefined : { opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.03, 0.35) }}
              className="min-w-[9.5rem] shrink-0 rounded-xl border border-amber-500/10 bg-gradient-to-b from-amber-950/30 to-black/50 px-3 py-2 shadow-sm"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-amber-200/65">
                {w.game}
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-emerald-300/95">
                {w.profit}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                {w.player} · {timeAgo(w.at)}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
