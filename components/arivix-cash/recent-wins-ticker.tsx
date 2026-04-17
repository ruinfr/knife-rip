"use client";

import { Icon } from "@/components/ui/icon";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

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

function WinChip({ w }: { w: WinRow }) {
  return (
    <div className="min-w-[8.5rem] shrink-0 rounded-lg border border-white/[0.08] bg-zinc-950/90 px-3 py-2 shadow-sm">
      <p className="text-[11px] font-medium text-muted">{w.game}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-edge">{w.profit}</p>
      <p className="mt-1 text-[11px] leading-snug text-muted">
        {w.player}
        <span className="text-muted/70"> · {timeAgo(w.at)}</span>
      </p>
    </div>
  );
}

export function RecentWinsTicker() {
  const [wins, setWins] = useState<WinRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/arivix-cash/recent-wins", {
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

  const loopWins = useMemo(() => {
    if (wins.length === 0) return [];
    return [...wins, ...wins];
  }, [wins]);

  const durationSec = Math.max(24, Math.min(64, wins.length * 14));

  return (
    <section
      className="rounded-xl border border-amber-500/15 bg-black/40 px-0 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      aria-label="Recent wins"
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-200/85">
          <Icon icon="mdi:fire" className="size-4 text-orange-400" aria-hidden />
          Recent wins
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          <Icon icon="mdi:refresh" className="size-3.5" aria-hidden />
          Refresh
        </button>
      </div>

      {err ? (
        <p className="px-4 text-sm text-muted">{err}</p>
      ) : wins.length === 0 ? (
        <p className="px-4 text-sm text-muted">No wins yet — take a seat.</p>
      ) : (
        <div
          className="arivix-cash-wins-track px-4"
          style={
            {
              "--arivix-cash-marquee-duration": `${durationSec}s`,
            } as CSSProperties & { "--arivix-cash-marquee-duration"?: string }
          }
        >
          <div className="arivix-cash-wins-marquee flex gap-2 pr-2">
            {loopWins.map((w, i) => (
              <WinChip key={`${w.at}-${w.player}-${i}`} w={w} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
