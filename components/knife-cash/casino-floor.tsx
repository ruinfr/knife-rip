"use client";

import type { ReactNode } from "react";

export function CasinoFloor({ children }: { children: ReactNode }) {
  return (
    <section
      className="knife-cash-floor-shell relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-emerald-950/25 via-zinc-950/95 to-black shadow-[0_0_0_1px_rgba(0,0,0,0.55),0_0_80px_-28px_rgba(234,179,8,0.18),inset_0_1px_0_rgba(255,255,255,0.05)]"
      aria-labelledby="knife-cash-tables-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent opacity-80"
        aria-hidden
      />
      <div className="relative border-b border-white/[0.06] bg-black/20 px-5 py-4 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-200/70">
          Tables
        </p>
        <h2
          id="knife-cash-tables-heading"
          className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl"
        >
          Arivix Cash floor
        </h2>
        <p className="mt-1 max-w-lg text-sm text-muted">
          Server-side outcomes · wallet cash only · play responsibly
        </p>
      </div>
      <div className="relative space-y-5 px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}
