"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  localeLabels,
  locales,
  type Locale,
} from "@/lib/i18n/config";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  locale: Locale;
  /** Aria label from translated messages */
  ariaLabel: string;
  selectLanguageLabel: string;
};

export function LanguageSwitcher({
  locale,
  ariaLabel,
  selectLanguageLabel,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = localeLabels[locale];

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  async function choose(next: Locale) {
    if (next === locale) {
      close();
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (res.ok) {
        close();
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={pending}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-surface/50 py-1.5 pl-2 pr-2.5 text-left",
          "motion-safe:transition hover:border-white/[0.18] hover:bg-surface/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          pending && "opacity-60",
        )}
      >
        <span
          className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] text-base leading-none"
          aria-hidden
        >
          {current.flag}
        </span>
        <span className="hidden min-w-0 sm:inline">
          <span className="font-semibold text-foreground">{current.label}</span>
          <span className="text-muted"> ({current.region})</span>
        </span>
        <Icon
          icon={open ? "mdi:chevron-up" : "mdi:chevron-down"}
          className="size-4 shrink-0 text-muted"
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-[120] min-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-white/[0.1] bg-[#1a1414] py-1.5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85)]"
          role="listbox"
          aria-label={selectLanguageLabel}
        >
          {locales.map((code) => {
            const row = localeLabels[code];
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                disabled={pending}
                onClick={() => void choose(code)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm",
                  "motion-safe:transition",
                  active
                    ? "bg-white/[0.07] text-foreground"
                    : "text-muted hover:bg-white/[0.05] hover:text-foreground",
                )}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] text-base leading-none"
                  aria-hidden
                >
                  {row.flag}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold text-foreground">
                    {row.label}
                  </span>
                  <span className="text-muted"> ({row.region})</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
