"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useState } from "react";

/** Show control when within this many pixels of the document bottom. */
const NEAR_BOTTOM_PX = 520;
/** Ignore tiny scrolls near the top (avoids flash on short viewports). */
const MIN_SCROLL_Y = 200;

function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  const update = useCallback(() => {
    const el = document.documentElement;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const docH = el.scrollHeight;
    const fromBottom = docH - (y + vh);
    const scrollable = docH > vh + 64;
    setVisible(
      scrollable && y >= MIN_SCROLL_Y && fromBottom <= NEAR_BOTTOM_PX,
    );
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[100] motion-safe:transition motion-safe:duration-300 motion-safe:ease-out",
        "motion-reduce:transition-none",
      )}
    >
      <div className="group relative flex flex-col items-center">
        <div
          className={cn(
            "pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 mb-0 min-w-max -translate-x-1/2",
            "rounded-xl border border-white/[0.1] bg-[#0a0a0a] px-3.5 py-2 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.9)]",
            "opacity-0 transition-opacity duration-200",
            "group-hover:opacity-100 group-focus-within:opacity-100",
          )}
          role="tooltip"
        >
          <span
            className={cn(
              "font-display text-sm font-bold tracking-tight text-accent-strong",
              "[text-shadow:-1.5px_0_rgba(56,189,248,0.65),1.5px_0_rgba(248,113,113,0.65)]",
            )}
          >
            Go to Top
          </span>
          <span
            className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2"
            aria-hidden
          >
            <span className="block size-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-[#0a0a0a] drop-shadow-[0_1px_0_rgba(255,255,255,0.06)]" />
          </span>
        </div>

        <button
          type="button"
          onClick={scrollToTop}
          className={cn(
            "flex size-12 items-center justify-center rounded-full",
            "border border-white/[0.12] bg-[#121212] text-accent-strong shadow-[0_4px_24px_-4px_rgba(0,0,0,0.75)]",
            "motion-safe:transition motion-safe:duration-200",
            "hover:border-edge/35 hover:bg-surface-elevated hover:text-foreground hover:shadow-[0_0_28px_-6px_rgba(37,99,235,0.35)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          aria-label="Back to top"
        >
          <Icon icon="mdi:arrow-up" className="size-6" aria-hidden />
        </button>
      </div>
    </div>
  );
}
