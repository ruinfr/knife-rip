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
  const [saveFailed, setSaveFailed] = useState(false);
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
    setSaveFailed(false);
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
      } else {
        setSaveFailed(true);
      }
    } catch {
      setSaveFailed(true);
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
          "inline-flex h-10 items-center gap-1.5 rounded-full border border-white/[0.12] bg-surface/50 px-2 text-left",
          "motion-safe:transition hover:border-white/[0.18] hover:bg-surface/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          pending && "opacity-60",
        )}
      >
        <span
          className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.08]"
          aria-hidden
        >
          <Icon icon={current.flagIcon} className="size-6" aria-hidden />
        </span>
        <Icon
          icon={open ? "mdi:chevron-up" : "mdi:chevron-down"}
          className="size-3.5 shrink-0 text-muted"
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-[120] min-w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/[0.1] bg-[#161010] py-1.5 shadow-[0_18px_56px_-14px_rgba(0,0,0,0.9)]"
          role="listbox"
          aria-label={selectLanguageLabel}
        >
          {saveFailed ? (
            <p className="mx-3 mb-1 rounded-lg border border-blue-500/25 bg-blue-950/35 px-2.5 py-2 text-[11px] leading-snug text-muted">
              Couldn&apos;t save language. Check your connection and try again.
            </p>
          ) : null}
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
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm motion-safe:transition",
                  active
                    ? "bg-white/[0.07] text-foreground"
                    : "text-muted hover:bg-white/[0.05] hover:text-foreground",
                )}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.08]"
                  aria-hidden
                >
                  <Icon icon={row.flagIcon} className="size-7" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-foreground">
                    {row.label}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {row.region}
                  </span>
                </span>
                {active ? (
                  <Icon
                    icon="mdi:check"
                    className="size-5 shrink-0 text-edge"
                    aria-hidden
                  />
                ) : (
                  <span className="size-5 shrink-0" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
