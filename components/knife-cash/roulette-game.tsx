"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  AMERICAN_WHEEL_CLOCKWISE,
  type RoulettePick,
  roulettePocketColor,
  wheelSlotIndexForSpinIndex,
} from "@/lib/economy/web-roulette-constants";
import { webGambleCooldownLabel } from "@/lib/economy/knife-cash-recent-wins";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";

const WHEEL_LEN = AMERICAN_WHEEL_CLOCKWISE.length;
const STEP_DEG = 360 / WHEEL_LEN;
const SPINS_PER_PLAY = 7;

function pocketColorCss(label: string): string {
  const c = roulettePocketColor(label);
  if (c === "green") return "#15803d";
  if (c === "red") return "#b91c1c";
  return "#1c1917";
}

type RouletteOk = {
  ok: true;
  pick: RoulettePick;
  pocketIdx: number;
  pocketLabel: string;
  ballColor: "green" | "red" | "black";
  won: boolean;
  payout: string;
  net: string;
  totalFormatted: string;
  cashFormatted?: string;
  bankCashFormatted?: string;
};

export function RouletteGame({
  onBalancesUpdated,
}: {
  onBalancesUpdated: () => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [bet, setBet] = useState("");
  const [pick, setPick] = useState<RoulettePick>("red");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [last, setLast] = useState<RouletteOk | null>(null);
  const [rotationDeg, setRotationDeg] = useState(0);

  const conicGradient = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < WHEEL_LEN; i++) {
      const label = AMERICAN_WHEEL_CLOCKWISE[i]!;
      const hex = pocketColorCss(label);
      const a = (i / WHEEL_LEN) * 100;
      const b = ((i + 1) / WHEEL_LEN) * 100;
      parts.push(`${hex} ${a}% ${b}%`);
    }
    return `conic-gradient(from -90deg, ${parts.join(", ")})`;
  }, []);

  const play = useCallback(async () => {
    setMsg(null);
    setLast(null);
    setBusy(true);
    try {
      const res = await fetch("/api/knife-cash/roulette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet: bet.trim(), pick }),
      });
      const data = (await res.json()) as RouletteOk & {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok) {
        setMsg(data.error ?? "Request failed");
        return;
      }

      if (data.ok && typeof data.pocketIdx === "number") {
        const slot = wheelSlotIndexForSpinIndex(data.pocketIdx);
        const theta = (slot + 0.5) * STEP_DEG;
        const delta = reduce ? -theta : 360 * SPINS_PER_PLAY - theta;
        setRotationDeg((r) => r + delta);

        setLast({
          ok: true,
          pick: data.pick,
          pocketLabel: data.pocketLabel,
          pocketIdx: data.pocketIdx,
          ballColor: data.ballColor,
          won: data.won,
          payout: data.payout,
          net: data.net,
          totalFormatted: data.totalFormatted,
          cashFormatted: data.cashFormatted,
          bankCashFormatted: data.bankCashFormatted,
        });

        const landed = `${data.pocketLabel} (${data.ballColor})`;
        setMsg(
          data.won
            ? `Landed ${landed}. You win — new total ${data.totalFormatted}`
            : `Landed ${landed}. House keeps the bet — new total ${data.totalFormatted}`,
        );
        await onBalancesUpdated();
      }
    } finally {
      setBusy(false);
    }
  }, [bet, onBalancesUpdated, pick, reduce]);

  return (
    <Card padding="lg" className="border-white/[0.06] bg-zinc-950/40">
      <h2 className="font-display text-base font-semibold text-foreground">
        American roulette
      </h2>
      <p className="mt-1 text-sm text-muted">
        38 pockets (0, 00, 1–36) · Same odds as Discord hub ·{" "}
        {webGambleCooldownLabel()} cooldown
      </p>

      <div className="relative mx-auto mt-6 flex max-w-sm justify-center">
        <div className="relative aspect-square w-full max-w-[280px]">
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
            aria-hidden
          >
            <div className="h-0 w-0 border-x-[10px] border-x-transparent border-t-[16px] border-t-amber-200 drop-shadow-md" />
          </div>
          <motion.div
            className="absolute inset-[6%] rounded-full border-[5px] border-amber-800/60 shadow-[inset_0_0_24px_rgba(0,0,0,0.45),0_12px_40px_rgba(0,0,0,0.55)]"
            style={{
              background: conicGradient,
              transformOrigin: "50% 50%",
            }}
            animate={{ rotate: rotationDeg }}
            transition={
              reduce
                ? { duration: 0.15 }
                : { duration: 3.2, ease: [0.15, 0.85, 0.2, 1] }
            }
          />
          <div className="pointer-events-none absolute inset-[28%] rounded-full border-2 border-amber-700/35 bg-zinc-950 shadow-[inset_0_2px_20px_rgba(0,0,0,0.85)]" />
          <div className="pointer-events-none absolute inset-[28%] flex items-center justify-center">
            <span className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/50">
              KC
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Bet color">
          {(
            [
              { id: "red" as const, label: "Red", icon: "mdi:circle" },
              { id: "black" as const, label: "Black", icon: "mdi:circle-outline" },
              { id: "green" as const, label: "Green (0 / 00)", icon: "mdi:star-four-points" },
            ] as const
          ).map((p) => (
            <Button
              key={p.id}
              type="button"
              variant={pick === p.id ? "primary" : "ghost"}
              disabled={busy}
              onClick={() => setPick(p.id)}
              className={cn(
                "gap-1.5",
                p.id === "red" && pick === p.id && "bg-red-700 hover:bg-red-600",
                p.id === "black" && pick === p.id && "bg-zinc-800 hover:bg-zinc-700",
                p.id === "green" && pick === p.id && "bg-emerald-800 hover:bg-emerald-700",
              )}
            >
              <Icon icon={p.icon} className="size-4" aria-hidden />
              {p.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[9rem] flex-col gap-1.5 text-sm">
            <span className="text-muted">Bet</span>
            <input
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Wallet amount"
              disabled={busy}
              className="rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2.5 font-mono text-sm text-foreground outline-none ring-edge/25 focus:ring-2 disabled:opacity-50"
            />
          </label>
          <Button
            type="button"
            onClick={() => void play()}
            disabled={busy || !bet.trim()}
            className="inline-flex items-center gap-2"
          >
            <Icon icon="mdi:bullseye-arrow" className="size-4" />
            {busy ? "Spinning…" : "Spin"}
          </Button>
        </div>
      </div>

      {last ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Icon
            icon={last.won ? "mdi:check-decagram" : "mdi:close-octagon-outline"}
            className="size-4 shrink-0 text-edge/80"
          />
          Last:{" "}
          <span className="font-medium text-foreground">
            {last.pocketLabel} ({last.ballColor})
          </span>
          <span className="text-muted">·</span>
          <span>
            {last.won ? `+${last.payout}` : last.net} cash · pick {last.pick}
          </span>
        </p>
      ) : null}

      {msg ? (
        <p
          className="relative mt-3 flex items-start gap-2 text-sm text-muted"
          role="status"
        >
          <Icon
            icon="mdi:information-outline"
            className="mt-0.5 size-4 shrink-0 text-edge/80"
          />
          {msg}
        </p>
      ) : null}
    </Card>
  );
}
