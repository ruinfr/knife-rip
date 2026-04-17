"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { WEB_SLOT_SYMBOLS } from "@/lib/economy/web-slot-symbols";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useState } from "react";

function randomSymbol(): string {
  return WEB_SLOT_SYMBOLS[Math.floor(Math.random() * WEB_SLOT_SYMBOLS.length)]!;
}

export function SlotMachineGame({
  onBalancesUpdated,
}: {
  onBalancesUpdated: () => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [bet, setBet] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reels, setReels] = useState<string[]>(["🍒", "🍋", "🍇"]);
  const [spinning, setSpinning] = useState(false);

  const play = useCallback(async () => {
    setMsg(null);
    setBusy(true);
    setSpinning(true);

    const tick = reduce
      ? null
      : setInterval(() => {
          setReels([randomSymbol(), randomSymbol(), randomSymbol()]);
        }, 85);

    try {
      const res = await fetch("/api/arivix-cash/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet: bet.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        reels?: string[];
        tier?: string;
        totalFormatted?: string;
        error?: string;
      };

      if (tick) clearInterval(tick);
      setSpinning(false);

      if (!res.ok) {
        setMsg(data.error ?? "Request failed");
        return;
      }

      if (data.ok && data.reels?.length === 3) {
        setReels(data.reels);
        const tier =
          data.tier === "triple"
            ? "Triple — 5×"
            : data.tier === "pair"
              ? "Pair — 1.5×"
              : "No match";
        setMsg(`${tier}. New total: ${data.totalFormatted}`);
        await onBalancesUpdated();
      }
    } catch {
      if (tick) clearInterval(tick);
      setSpinning(false);
      setMsg("Network error");
    } finally {
      setBusy(false);
    }
  }, [bet, onBalancesUpdated, reduce]);

  return (
    <Card padding="lg" className="border-white/[0.06] bg-zinc-950/40">
      <h2 className="font-display text-base font-semibold text-foreground">
        Slots
      </h2>
      <p className="mt-1 text-sm text-muted">
        Three reels · triple <span className="text-foreground/90">5×</span> · pair{" "}
        <span className="text-foreground/90">1.5×</span> (min 1 back)
      </p>

      <div className="relative mx-auto mt-6 flex max-w-md justify-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-5 sm:gap-3 sm:px-4">
        {reels.map((sym, i) => (
          <motion.div
            key={`col-${i}`}
            className="flex h-24 flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-zinc-900/80 sm:h-28"
            animate={
              spinning && !reduce
                ? { y: [0, -6, 0], filter: ["blur(0px)", "blur(1px)", "blur(0px)"] }
                : { y: 0, filter: "blur(0px)" }
            }
            transition={
              spinning
                ? { duration: 0.28, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.35, type: "spring", stiffness: 420, damping: 28 }
            }
          >
            <span className="select-none text-4xl sm:text-5xl" aria-hidden>
              {sym}
            </span>
          </motion.div>
        ))}
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
          <Icon icon="mdi:play-circle-outline" className="size-4" />
          {busy ? "Spinning…" : "Spin"}
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
