"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { DOCS_NAV_GROUPS, DOCS_QUICK_LINKS } from "@/lib/docs/nav-config";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

function navActive(pathname: string, href: string) {
  if (href === "/docs") return pathname === "/docs";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DocsSidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname() ?? "";
  const reduce = useReducedMotion();

  const inner = (
    <div className="flex h-full flex-col overflow-y-auto px-3 py-4 sm:px-4">
      <div className="mb-5 space-y-1">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          Jump
        </p>
        {DOCS_QUICK_LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href ||
                pathname.startsWith(link.href.split("#")[0] ?? "");
          return (
            <Link
              key={link.href + link.title}
              href={link.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm motion-safe:transition",
                active
                  ? "bg-blue-950/45 text-foreground ring-1 ring-edge/25"
                  : "text-muted hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <Icon icon={link.icon} className="size-4 shrink-0 opacity-90" aria-hidden />
              {link.title}
            </Link>
          );
        })}
      </div>

      {DOCS_NAV_GROUPS.map((group, gi) => (
        <div key={group.id} className={cn(gi > 0 && "mt-6")}>
          <p className="mb-2 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            <Icon icon={group.icon} className="size-3.5 text-edge/80" aria-hidden />
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = navActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] leading-snug motion-safe:transition",
                      active
                        ? "bg-blue-950/40 text-foreground ring-1 ring-edge/20"
                        : "text-muted hover:bg-white/[0.04] hover:text-foreground",
                    )}
                  >
                    <Icon
                      icon={item.icon}
                      className="size-3.5 shrink-0 opacity-80"
                      aria-hidden
                    />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <aside
        id="docs-sidebar"
        className="hidden w-[17.5rem] shrink-0 border-r border-blue-950/25 bg-surface/40 lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:flex-col"
      >
        {inner}
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm lg:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              onClick={onCloseMobile}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-[81] flex w-[min(20rem,88vw)] flex-col border-r border-blue-950/30 bg-surface-elevated shadow-2xl lg:hidden"
              initial={reduce ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              {inner}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
