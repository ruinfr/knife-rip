"use client";

import { Icon } from "@/components/ui/icon";
import type { ReactNode } from "react";

export function CasinoFloor({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-[1.35rem] border-2 border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-black/40 to-black/80 p-[2px] shadow-[0_0_80px_-20px_rgba(234,179,8,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div
        className="relative overflow-hidden rounded-[1.2rem] px-4 py-5 sm:px-6 sm:py-6"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 14px,
              rgba(255, 255, 255, 0.03) 14px,
              rgba(255, 255, 255, 0.03) 15px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 14px,
              rgba(255, 255, 255, 0.025) 14px,
              rgba(255, 255, 255, 0.025) 15px
            ),
            radial-gradient(ellipse 100% 80% at 50% -30%, rgba(234, 179, 8, 0.14), transparent 50%),
            linear-gradient(165deg, rgb(6 20 14 / 0.97) 0%, rgb(2 8 6 / 0.99) 45%, rgb(0 0 0) 100%)
          `,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
          aria-hidden
        />
        <header className="relative mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
          <div>
            <p className="font-display text-[10px] font-bold tracking-[0.35em] text-amber-400/85 sm:text-xs">
              KNIFE TABLES
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold tracking-tight text-amber-50 sm:text-2xl">
              Digital casino
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-emerald-100/55">
              Same Knife Cash wallet as Discord · outcomes resolved on the server ·
              play responsibly
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-amber-500/25 bg-black/35 px-3 py-2 text-amber-200/90 shadow-[0_0_24px_-8px_rgba(234,179,8,0.4)]">
            <Icon icon="mdi:cards-playing-club-multiple-outline" className="size-6" />
            <span className="hidden text-[11px] font-medium uppercase tracking-wider text-amber-200/70 sm:inline">
              Live wallet
            </span>
          </div>
        </header>
        <div className="relative space-y-5">{children}</div>
      </div>
    </div>
  );
}
