"use client";

import { DocsSearchModal, useDocsSearchShortcut } from "@/components/docs/docs-search-modal";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

export function DocsLayoutClient({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduce = useReducedMotion();

  useDocsSearchShortcut(setSearchOpen);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(37,99,235,0.09),transparent_52%)]">
      <div
        className={cn(
          "sticky top-14 z-[70] border-b border-blue-950/25 bg-background/75 backdrop-blur-xl sm:top-16",
        )}
      >
        <div className="mx-auto flex max-w-[100rem] items-center gap-3 px-3 py-2.5 sm:px-4 lg:px-6">
          <motion.button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-white/[0.1] bg-surface/50 p-2 text-muted lg:hidden"
            whileTap={reduce ? undefined : { scale: 0.96 }}
            aria-expanded={menuOpen}
            aria-controls="docs-sidebar"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon icon="mdi:menu" className="size-5" aria-hidden />
          </motion.button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted motion-safe:transition hover:text-foreground"
            >
              <Icon icon="mdi:home-outline" className="size-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <span className="text-muted/40" aria-hidden>
              /
            </span>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted motion-safe:transition hover:text-foreground"
            >
              <Icon
                icon="mdi:view-dashboard-outline"
                className="size-4 shrink-0"
                aria-hidden
              />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="text-muted/40" aria-hidden>
              /
            </span>
            <Link
              href="/docs/resources#community"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted motion-safe:transition hover:text-foreground"
            >
              <Icon icon="mdi:discord" className="size-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Discord</span>
            </Link>
          </div>

          <motion.button
            type="button"
            onClick={() => setSearchOpen(true)}
            whileTap={reduce ? undefined : { scale: 0.98 }}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/[0.1] bg-surface/40 px-3 py-2 text-left text-muted lg:max-w-xs",
              "motion-safe:transition hover:border-edge/25 hover:bg-surface/55",
            )}
          >
            <Icon icon="mdi:magnify" className="size-4 shrink-0" aria-hidden />
            <span className="truncate text-sm">Search…</span>
            <span className="ml-auto hidden shrink-0 items-center gap-1 sm:flex">
              <kbd className="rounded border border-white/10 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                Ctrl
              </kbd>
              <kbd className="rounded border border-white/10 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                K
              </kbd>
            </span>
          </motion.button>
        </div>
      </div>

      <div className="mx-auto flex max-w-[100rem]">
        <DocsSidebar mobileOpen={menuOpen} onCloseMobile={() => setMenuOpen(false)} />
        <motion.div
          className="min-w-0 flex-1 px-4 py-10 sm:px-6 lg:px-10 lg:py-12"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-auto max-w-3xl 2xl:max-w-[48rem]">{children}</div>
        </motion.div>
      </div>

      <DocsSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
