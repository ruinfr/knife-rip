"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { webGambleCooldownLabel } from "@/lib/economy/knife-cash-recent-wins";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { useCallback, useState } from "react";

type CoinflipOk = {
  ok: true;
  won: boolean;
  face: "heads" | "tails";
  totalFormatted: string;
  cashFormatted?: string;
  bankCashFormatted?: string;
};

export function CoinFlipGame({
  onBalancesUpdated,
}: {
  onBalancesUpdated: () => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const controls = useAnimation();
  const [bet, setBet] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [last, setLast] = useState<CoinflipOk | null>(null);

  const play = useCallback(async () => {
    setMsg(null);
    setLast(null);
    setBusy(true);
    const body = { bet: bet.trim() };
    try {
      const res = await Promise.all([
        fetch("/api/knife-cash/coinflip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        reduce
          ? Promise.resolve(true)
          : controls.start({
              rotateY: 360 * 10,
              transition: { duration: 1.12, ease: "linear" },
            }),
      ]).then(([r]) => r);
      const data = (await res.json()) as CoinflipOk & {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok) {
        setMsg(data.error ?? "Request failed");
        await controls.start({ rotateY: 0, transition: { duration: 0.2 } });
        return;
      }

      if (data.ok && data.face) {
        if (!reduce && !data.won) {
          await controls.start({
            rotateY: 360 * 10 + 180,
            transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          });
        }
        setLast({
          ok: true,
          won: data.won,
          face: data.face,
          totalFormatted: data.totalFormatted,
          cashFormatted: data.cashFormatted,
          bankCashFormatted: data.bankCashFormatted,
        });
        setMsg(
          data.won
            ? `Heads — you win. New total: ${data.totalFormatted}`
            : `Tails — house wins. New total: ${data.totalFormatted}`,
        );
        await onBalancesUpdated();
      }
    } finally {
      setBusy(false);
    }
  }, [bet, controls, onBalancesUpdated, reduce]);

  return (
    <Card
      padding="lg"
      elevated
      className="relative overflow-hidden border-amber-500/15 bg-gradient-to-b from-amber-950/25 via-surface/80 to-black/55 shadow-[0_0_50px_-18px_rgba(234,179,8,0.2)]"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-edge/10 blur-3xl"
        aria-hidden
      />
      <h2 className="relative flex items-center gap-2 font-display text-lg font-semibold text-accent-strong">
        <Icon icon="mdi:coin-outline" className="size-6 text-amber-300/90" />
        Coin flip
      </h2>
      <p className="relative mt-1 text-sm text-muted">
        Realistic 3D-style coin — outcome is server-side. Odds align with the Discord
        hub (slight house edge scales with rebirth tier).{" "}
        <span className="inline-flex items-center gap-1 text-foreground/80">
          <Icon icon="mdi:timer-sand" className="size-3.5" />
          {webGambleCooldownLabel()} between plays (anti double-tap)
        </span>
      </p>

      <div className="relative mx-auto mt-6 flex justify-center [perspective:900px]">
        <motion.div
          className="relative h-36 w-36 [transform-style:preserve-3d] sm:h-40 sm:w-40"
          initial={{ rotateY: 0 }}
          animate={controls}
        >
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-amber-700/50 bg-gradient-to-br from-amber-100 via-amber-400 to-amber-800 text-amber-950 shadow-[inset_0_3px_16px_rgba(255,255,255,0.45),0_12px_40px_rgba(0,0,0,0.5)] [backface-visibility:hidden]"
            style={{ transform: "translateZ(4px)" }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <Icon icon="mdi:crown-outline" className="size-8 opacity-80" />
              <span className="font-display text-sm font-bold tracking-wide">
                HEADS
              </span>
            </div>
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-slate-600/60 bg-gradient-to-br from-slate-200 via-slate-500 to-slate-800 text-slate-950 shadow-[inset_0_2px_12px_rgba(255,255,255,0.25),0_10px_36px_rgba(0,0,0,0.45)] [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg) translateZ(4px)" }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <Icon icon="mdi:numeric-2-circle-outline" className="size-8 opacity-90" />
              <span className="font-display text-sm font-bold tracking-wide">
                TAILS
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="relative mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Icon icon="mdi:numeric" className="size-3.5" />
            Bet (wallet)
          </span>
          <input
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Amount"
            disabled={busy}
            className="min-w-[10rem] rounded-lg border border-white/[0.12] bg-black/35 px-3 py-2 font-mono text-sm text-foreground outline-none ring-edge/30 focus:ring-2 disabled:opacity-50"
          />
        </label>
        <Button
          type="button"
          onClick={() => void play()}
          disabled={busy || !bet.trim()}
          className="inline-flex items-center gap-2"
        >
          <Icon icon="mdi:rotate-3d-variant" className="size-4" />
          {busy ? "Flipping…" : "Flip coin"}
        </Button>
      </div>

      {last ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Icon
            icon={last.won ? "mdi:check-decagram" : "mdi:close-octagon-outline"}
            className="size-4 shrink-0 text-edge/80"
          />
          Last: <span className="font-medium text-foreground">{last.face}</span>
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
