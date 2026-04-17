"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DiceFace } from "@/components/arivix-cash/dice-face";
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
      const res = await fetch("/api/arivix-cash/dice", {
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
    <Card padding="lg" className="border-white/[0.06] bg-zinc-950/40">
      <h2 className="font-display text-base font-semibold text-foreground">
        Dice duel
      </h2>
      <p className="mt-1 text-sm text-muted">
        You vs house, high roll wins <span className="text-foreground/90">2×</span>;
        push returns stake. Rebirth can grant a second roll when you trail.
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
