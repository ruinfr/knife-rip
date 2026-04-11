"use client";

import { CoinFlipGame } from "@/components/knife-cash/coin-flip-game";
import { DiceDuelGame } from "@/components/knife-cash/dice-duel-game";
import { SlotMachineGame } from "@/components/knife-cash/slot-machine-game";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const TABS = [
  { id: "coin" as const, label: "Coin", icon: "mdi:coin-outline" },
  { id: "dice" as const, label: "Dice", icon: "mdi:dice-6-outline" },
  { id: "slots" as const, label: "Slots", icon: "mdi:slot-machine" },
];

export function GamesCasinoPanel({
  onBalancesUpdated,
}: {
  onBalancesUpdated: () => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("coin");

  return (
    <motion.div
      className="space-y-4"
      initial={reduce ? undefined : { opacity: 0, y: 14 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="flex flex-wrap gap-2 rounded-2xl border border-amber-500/20 bg-black/45 p-1.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.45)] backdrop-blur-sm"
        role="tablist"
        aria-label="Knife Cash games"
      >
        {TABS.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant={tab === t.id ? "primary" : "ghost"}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex-1 min-w-[5.5rem] gap-2 border border-transparent sm:flex-initial",
              tab === t.id &&
                "border-amber-400/35 shadow-[0_0_28px_-10px_rgba(234,179,8,0.55)]",
            )}
            role="tab"
            aria-selected={tab === t.id}
          >
            <Icon icon={t.icon} className="size-4" />
            {t.label}
            {tab === t.id && !reduce ? (
              <motion.span
                layoutId="knifeCashTabGlow"
                className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-edge/25"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            ) : null}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          role="tabpanel"
          initial={
            reduce
              ? undefined
              : { opacity: 0, x: 16, filter: "blur(4px)" }
          }
          animate={
            reduce ? undefined : { opacity: 1, x: 0, filter: "blur(0px)" }
          }
          exit={
            reduce
              ? undefined
              : { opacity: 0, x: -12, filter: "blur(3px)" }
          }
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === "coin" ? (
            <CoinFlipGame onBalancesUpdated={onBalancesUpdated} />
          ) : null}
          {tab === "dice" ? (
            <DiceDuelGame onBalancesUpdated={onBalancesUpdated} />
          ) : null}
          {tab === "slots" ? (
            <SlotMachineGame onBalancesUpdated={onBalancesUpdated} />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
