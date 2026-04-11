"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DiceFace } from "@/components/knife-cash/dice-face";
import { Icon } from "@/components/ui/icon";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useState } from "react";

function randomDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export function DiceDuelGame({
  onBalancesUpdated,
}: {
  onBalancesUpdated: () => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [bet, setBet] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [you, setYou] = useState(1);
  const [house, setHouse] = useState(1);
  const [rolling, setRolling] = useState(false);

  const play = useCallback(async () => {
    setMsg(null);
    setBusy(true);
    setRolling(true);

    const tick = reduce
      ? null
      : setInterval(() => {
          setYou(randomDie());
          setHouse(randomDie());
        }, 70);

    try {
      const res = await fetch("/api/knife-cash/dice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet: bet.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        you?: number;
        house?: number;
        outcome?: string;
        totalFormatted?: string;
        error?: string;
      };

      if (tick) clearInterval(tick);
      setRolling(false);

      if (!res.ok) {
        setMsg(data.error ?? "Request failed");
        return;
      }

      if (data.ok && data.you != null && data.house != null) {
        setYou(data.you);
        setHouse(data.house);
        const line =
          data.outcome === "win"
            ? "You win — higher roll pays 2×."
            : data.outcome === "push"
              ? "Push — stake returned."
              : "House wins.";
        setMsg(
          `${line} You ${data.you} vs house ${data.house}. Total: ${data.totalFormatted}`,
        );
        await onBalancesUpdated();
      }
    } catch {
      if (tick) clearInterval(tick);
      setRolling(false);
      setMsg("Network error");
    } finally {
      setBusy(false);
    }
  }, [bet, onBalancesUpdated, reduce]);

  return (
    <Card
      padding="lg"
      elevated
      className="relative overflow-hidden border-amber-500/12 bg-gradient-to-b from-slate-950/80 via-emerald-950/20 to-black/60 shadow-[0_0_48px_-16px_rgba(52,211,153,0.12)]"
    >
      <div
        className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl"
        aria-hidden
      />
      <h2 className="relative flex items-center gap-2 font-display text-lg font-semibold text-accent-strong">
        <Icon icon="mdi:dice-6-outline" className="size-6 text-sky-300/90" />
        Dice duel
      </h2>
      <p className="relative mt-1 text-sm text-muted">
        Two casino dice — you vs house. Higher wins **2×**; tie returns your stake
        (same rules as Discord). Rebirth can nudge a re-roll when you&apos;re behind.
      </p>

      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        <motion.div
          animate={
            rolling && !reduce
              ? {
                  rotateX: [0, 18, -14, 12, 0],
                  rotateZ: [0, -6, 8, -4, 0],
                }
              : { rotateX: 0, rotateZ: 0 }
          }
          transition={
            rolling
              ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.35 }
          }
          className="flex flex-col items-center gap-2"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-edge/90">
            You
          </span>
          <DiceFace value={you} />
        </motion.div>
        <div className="hidden text-2xl text-muted sm:block" aria-hidden>
          VS
        </div>
        <motion.div
          animate={
            rolling && !reduce
              ? {
                  rotateX: [0, -16, 14, -10, 0],
                  rotateZ: [0, 7, -9, 5, 0],
                }
              : { rotateX: 0, rotateZ: 0 }
          }
          transition={
            rolling
              ? { duration: 0.42, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.35 }
          }
          className="flex flex-col items-center gap-2"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            House
          </span>
          <DiceFace value={house} />
        </motion.div>
      </div>

      <div className="relative mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Bet (wallet)</span>
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
          <Icon icon="mdi:dice-multiple-outline" className="size-4" />
          {busy ? "Rolling…" : "Roll"}
        </Button>
      </div>

      {msg ? (
        <p className="relative mt-3 text-sm text-muted" role="status">
          {msg}
        </p>
      ) : null}
    </Card>
  );
}
