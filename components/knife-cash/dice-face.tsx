"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

const PIP = "rounded-full bg-slate-900 shadow-sm";

/** Casino-style die (1–6) with standard pip layout. */
export function DiceFace({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const v = Math.min(6, Math.max(1, Math.floor(value)));

  const pips: Record<number, ReactNode> = {
    1: (
      <div className="grid h-full w-full place-items-center">
        <div className={cn(PIP, "size-3.5 sm:size-4")} />
      </div>
    ),
    2: (
      <div className="grid h-full w-full grid-cols-2 gap-1 p-2">
        <div className={cn(PIP, "size-3 sm:size-3.5 place-self-start")} />
        <div className={cn(PIP, "size-3 sm:size-3.5 place-self-end")} />
      </div>
    ),
    3: (
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5 p-2">
        <div className={cn(PIP, "size-2.5 sm:size-3 col-start-1 row-start-1")} />
        <div className={cn(PIP, "size-2.5 sm:size-3 col-start-2 row-start-2 place-self-center")} />
        <div className={cn(PIP, "size-2.5 sm:size-3 col-start-3 row-start-3 place-self-end")} />
      </div>
    ),
    4: (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 p-2.5">
        <div className={cn(PIP, "size-3 sm:size-3.5")} />
        <div className={cn(PIP, "size-3 sm:size-3.5 place-self-end")} />
        <div className={cn(PIP, "size-3 sm:size-3.5")} />
        <div className={cn(PIP, "size-3 sm:size-3.5 place-self-end")} />
      </div>
    ),
    5: (
      <div className="relative h-full w-full p-2">
        <div className="grid h-full w-full grid-cols-3 grid-rows-3">
          <div className={cn(PIP, "size-2.5 sm:size-3")} />
          <div />
          <div className={cn(PIP, "size-2.5 sm:size-3 place-self-end")} />
          <div />
          <div className={cn(PIP, "size-2.5 sm:size-3 place-self-center")} />
          <div />
          <div className={cn(PIP, "size-2.5 sm:size-3 place-self-end")} />
          <div />
          <div className={cn(PIP, "size-2.5 sm:size-3")} />
        </div>
      </div>
    ),
    6: (
      <div className="grid h-full w-full grid-cols-2 grid-rows-3 gap-x-3 gap-y-1.5 px-3 py-2">
        <div className={cn(PIP, "size-2.5 sm:size-3")} />
        <div className={cn(PIP, "size-2.5 sm:size-3")} />
        <div className={cn(PIP, "size-2.5 sm:size-3")} />
        <div className={cn(PIP, "size-2.5 sm:size-3")} />
        <div className={cn(PIP, "size-2.5 sm:size-3")} />
        <div className={cn(PIP, "size-2.5 sm:size-3")} />
      </div>
    ),
  };

  return (
    <div
      className={cn(
        "flex aspect-square w-24 select-none rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white via-slate-100 to-slate-300 shadow-[inset_0_2px_8px_rgba(255,255,255,0.9),0_8px_24px_rgba(0,0,0,0.35)] sm:w-28",
        className,
      )}
    >
      {pips[v]}
    </div>
  );
}
