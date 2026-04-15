"use client";

import { ShowcaseTile, type ShowcaseTileItem } from "@/components/showcase-tile";
import type { CSSProperties } from "react";
import { useLayoutEffect, useRef } from "react";

type Props = {
  communities: ShowcaseTileItem[];
  /**
   * Seconds for one full pass through the list (before loop repeats).
   * Higher = slower drift.
   */
  loopDurationSec?: number;
};

/** Default: ~2.5× faster than the original (32s floor, 5s per item). */
const DEFAULT_SEC_PER_ITEM = 2;
const DEFAULT_MIN_LOOP_SEC = 14;

/**
 * Fixed viewport shows exactly three tiles; the row scrolls continuously in a
 * seamless loop. Shift distance is measured so it works for any list length.
 */
export function ShowcaseCarousel({
  communities,
  loopDurationSec,
}: Props) {
  const ulRef = useRef<HTMLUListElement>(null);

  const duration =
    loopDurationSec ??
    Math.max(DEFAULT_MIN_LOOP_SEC, communities.length * DEFAULT_SEC_PER_ITEM);

  const looped = [...communities, ...communities];

  useLayoutEffect(() => {
    const ul = ulRef.current;
    if (!ul || communities.length === 0) return;

    const n = communities.length;
    const applyShift = () => {
      const secondHead = ul.children[n] as HTMLElement | undefined;
      if (secondHead) {
        ul.style.setProperty(
          "--showcase-marquee-shift",
          `-${secondHead.offsetLeft}px`,
        );
      }
    };

    applyShift();
    const ro = new ResizeObserver(applyShift);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [communities]);

  if (communities.length === 0) return null;

  /** Viewport shows up to 3 tiles; width matches count so short lists stay centered. */
  const visibleSlots = Math.min(3, communities.length);
  const gapRem = 1.125;
  const viewportWidth =
    visibleSlots <= 1
      ? "7.5rem"
      : `min(100%, calc(${visibleSlots} * 7.5rem + ${visibleSlots - 1} * ${gapRem}rem))`;

  return (
    <div
      className="showcase-marquee-wrap relative max-w-full shrink-0 overflow-hidden"
      role="region"
      aria-label="Featured Arivix communities, auto-scrolling"
      style={{ width: viewportWidth }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-background from-40% to-transparent sm:w-8"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-l from-background from-40% to-transparent sm:w-8"
        aria-hidden
      />
      <ul
        ref={ulRef}
        className="showcase-marquee-track m-0 flex w-max list-none gap-[1.125rem] py-1"
        style={
          {
            "--showcase-marquee-duration": `${duration}s`,
          } as CSSProperties
        }
      >
        {looped.map((s, i) => (
          <li key={`${s.key}-${i}`} className="w-[7.5rem] shrink-0">
            <ShowcaseTile s={s} interactive={false} />
          </li>
        ))}
      </ul>
    </div>
  );
}
