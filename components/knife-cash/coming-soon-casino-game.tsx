"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { motion, useReducedMotion } from "framer-motion";

const COPY: Record<
  "blackjack" | "mines" | "roulette",
  { blurb: string; accent: string }
> = {
  blackjack: {
    blurb: "Full hand flow like the Discord hub — hit, stand, double, split.",
    accent: "from-rose-950/50 via-zinc-950/90 to-black",
  },
  mines: {
    blurb: "Rainbet-style grid — same bomb math and multipliers as Discord.",
    accent: "from-slate-900/80 via-emerald-950/40 to-black",
  },
  roulette: {
    blurb: "American wheel — red, black, and green — matching hub payouts.",
    accent: "from-red-950/30 via-zinc-950/90 to-black",
  },
};

export function ComingSoonCasinoGame({
  variant,
  title,
}: {
  variant: "blackjack" | "mines" | "roulette";
  title: string;
}) {
  const reduce = useReducedMotion();
  const { blurb, accent } = COPY[variant];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b p-6 shadow-[0_0_60px_-24px_rgba(234,179,8,0.25)]",
        accent,
      )}
    >
      <h2 className="relative text-center font-display text-lg font-semibold text-foreground">
        {title}
      </h2>
      <p className="relative mt-1 text-center text-xs text-muted">
        Table reserved — web build in progress
      </p>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -12deg,
            transparent,
            transparent 8px,
            rgba(255,255,255,0.04) 8px,
            rgba(255,255,255,0.04) 9px
          )`,
        }}
        aria-hidden
      />

      <div className="pointer-events-none absolute -right-8 top-6 flex gap-2 opacity-40">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/30 bg-gradient-to-br from-amber-200/20 to-amber-900/40 text-lg shadow-lg"
            animate={
              reduce
                ? undefined
                : { y: [0, -6, 0], rotate: [0, 4, -3, 0] }
            }
            transition={{
              duration: 2.4 + i * 0.35,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
            aria-hidden
          >
            🪙
          </motion.span>
        ))}
      </div>

      {variant === "blackjack" ? (
        <motion.div
          className="relative mb-6 mt-5 flex justify-center gap-2"
          animate={
            reduce ? undefined : { y: [0, -3, 0] }
          }
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="h-24 w-[4.25rem] rounded-lg border-2 border-white/20 bg-gradient-to-b from-white to-zinc-300 shadow-xl [transform:rotate(-8deg)]">
            <span className="flex h-full items-center justify-center text-2xl font-bold text-red-700">
              A
            </span>
          </div>
          <div className="h-24 w-[4.25rem] rounded-lg border-2 border-white/20 bg-gradient-to-b from-white to-zinc-300 shadow-xl [transform:rotate(6deg)] translate-y-2">
            <span className="flex h-full items-center justify-center text-2xl">♠</span>
          </div>
        </motion.div>
      ) : null}

      {variant === "mines" ? (
        <div className="relative mb-6 mt-5 grid grid-cols-5 gap-1.5 sm:mx-auto sm:max-w-xs">
          {Array.from({ length: 15 }, (_, i) => (
            <motion.div
              key={i}
              className={cn(
                "aspect-square rounded-md border text-[10px] font-bold",
                i % 4 === 0
                  ? "border-red-500/40 bg-red-950/50 text-red-300/80"
                  : "border-emerald-500/25 bg-emerald-950/30 text-emerald-200/70",
              )}
              animate={
                reduce || i % 4 === 0
                  ? undefined
                  : {
                      boxShadow: [
                        "0 0 0 0 rgba(52,211,153,0)",
                        "0 0 12px 0 rgba(52,211,153,0.25)",
                        "0 0 0 0 rgba(52,211,153,0)",
                      ],
                    }
              }
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: (i % 7) * 0.12,
              }}
            >
              <span className="flex h-full items-center justify-center">
                {i % 4 === 0 ? "💣" : "·"}
              </span>
            </motion.div>
          ))}
        </div>
      ) : null}

      {variant === "roulette" ? (
        <div className="relative mb-6 mt-5 flex justify-center">
          <motion.div
            className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-amber-600/50 bg-[conic-gradient(from_0deg,#1a1a1a_0deg_18deg,#b91c1c_18deg_198deg,#171717_198deg_216deg,#b91c1c_216deg_360deg)] shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            aria-hidden
          >
            <div className="absolute inset-3 rounded-full border border-white/10 bg-zinc-900/95 shadow-inner" />
            <motion.span
              className="relative z-[1] text-2xl"
              animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              🎰
            </motion.span>
          </motion.div>
        </div>
      ) : null}

      <div className="relative text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/90">
          <Icon icon="mdi:lock-outline" className="size-3.5" aria-hidden />
          Opening soon
        </span>
        <p className="mt-4 text-sm leading-relaxed text-muted">{blurb}</p>
      </div>
    </div>
  );
}
