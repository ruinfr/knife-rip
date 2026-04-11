"use client";

import { BlackjackGame } from "@/components/knife-cash/blackjack-game";
import { CoinFlipGame } from "@/components/knife-cash/coin-flip-game";
import { ComingSoonCasinoGame } from "@/components/knife-cash/coming-soon-casino-game";
import { DiceDuelGame } from "@/components/knife-cash/dice-duel-game";
import { SlotMachineGame } from "@/components/knife-cash/slot-machine-game";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const TABS = [
  { id: "coin" as const, label: "Coin", icon: "mdi:coin-outline", live: true },
  { id: "dice" as const, label: "Dice", icon: "mdi:dice-6-outline", live: true },
  { id: "slots" as const, label: "Slots", icon: "mdi:slot-machine", live: true },
  {
    id: "blackjack" as const,
    label: "Blackjack",
    icon: "mdi:cards-playing-outline",
    live: true,
  },
  { id: "mines" as const, label: "Mines", icon: "mdi:grid", live: false },
  {
    id: "roulette" as const,
    label: "Roulette",
    icon: "mdi:bullseye",
    live: false,
  },
];

type TabId = (typeof TABS)[number]["id"];

export function GamesCasinoPanel({
  onBalancesUpdated,
}: {
  onBalancesUpdated: () => Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<TabId>("coin");

  return (
    <motion.div
      className="space-y-4"
      initial={reduce ? undefined : { opacity: 0, y: 8 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="-mx-1 flex flex-nowrap gap-1 overflow-x-auto overflow-y-visible rounded-xl border border-amber-500/15 bg-black/55 p-1 pb-2 shadow-[inset_0_2px_24px_rgba(0,0,0,0.5)] [scrollbar-width:thin]"
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
              "relative shrink-0 gap-1.5 px-3 sm:gap-2",
              tab === t.id &&
                "shadow-[0_0_24px_-8px_rgba(234,179,8,0.35)]",
              !t.live && tab !== t.id && "opacity-80",
            )}
            role="tab"
            aria-selected={tab === t.id}
          >
            <Icon icon={t.icon} className="size-4" aria-hidden />
            <span className="whitespace-nowrap">{t.label}</span>
            {!t.live ? (
              <span
                className="ml-0.5 rounded bg-amber-500/20 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-amber-200/90"
                title="Coming soon"
              >
                Soon
              </span>
            ) : null}
            {tab === t.id && !reduce ? (
              <motion.span
                layoutId="knifeCashTabGlow"
                className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-amber-400/40"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            ) : null}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          role="tabpanel"
          initial={reduce ? undefined : { opacity: 0, scale: 0.985 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === "coin" ? (
            <div className="rounded-2xl border border-amber-500/10 bg-gradient-to-b from-amber-950/15 to-transparent p-1 shadow-[0_0_40px_-20px_rgba(234,179,8,0.2)]">
              <CoinFlipGame onBalancesUpdated={onBalancesUpdated} />
            </div>
          ) : null}
          {tab === "dice" ? (
            <div className="rounded-2xl border border-emerald-500/10 bg-gradient-to-b from-emerald-950/15 to-transparent p-1 shadow-[0_0_40px_-20px_rgba(52,211,153,0.12)]">
              <DiceDuelGame onBalancesUpdated={onBalancesUpdated} />
            </div>
          ) : null}
          {tab === "slots" ? (
            <div className="rounded-2xl border border-violet-500/10 bg-gradient-to-b from-violet-950/20 to-transparent p-1 shadow-[0_0_40px_-20px_rgba(167,139,250,0.12)]">
              <SlotMachineGame onBalancesUpdated={onBalancesUpdated} />
            </div>
          ) : null}
          {tab === "blackjack" ? (
            <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-b from-emerald-950/20 to-transparent p-1 shadow-[0_0_40px_-18px_rgba(16,185,129,0.18)]">
              <BlackjackGame onBalancesUpdated={onBalancesUpdated} />
            </div>
          ) : null}
          {tab === "mines" ? (
            <ComingSoonCasinoGame variant="mines" title="Mines" />
          ) : null}
          {tab === "roulette" ? (
            <ComingSoonCasinoGame variant="roulette" title="Roulette" />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
