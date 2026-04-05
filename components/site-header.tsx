"use client";

import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

const nav = [
  { href: "/docs", label: "Docs" },
  { href: "/commands", label: "Commands" },
  { href: "/pricing", label: "Pricing" },
  { href: "/status", label: "Status" },
] as const;

function linkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-red-950/35 bg-background/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="motion-safe:transition flex shrink-0 items-center gap-2.5 rounded-full py-1 text-accent-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <BrandMark className="h-7 w-7 text-edge sm:h-8 sm:w-8" />
          <span className="font-display text-lg font-bold tracking-tight">
            Knife
          </span>
        </Link>

        <nav
          className="hidden flex-1 justify-center md:flex"
          aria-label="Main"
        >
          <div className="nav-pill-sheen inline-flex items-center gap-0.5 rounded-full border border-white/[0.07] bg-surface/45 px-1 py-1 shadow-[0_0_40px_-18px_rgba(220,38,38,0.18)] backdrop-blur-md">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "motion-safe:transition rounded-full px-4 py-2 text-sm font-medium tracking-tight",
                  linkActive(pathname, item.href)
                    ? "bg-surface-elevated/95 text-foreground shadow-sm ring-1 ring-white/[0.06]"
                    : "text-muted hover:bg-white/[0.04] hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 md:flex">
            {status === "loading" ? (
              <span className="text-sm text-muted" aria-live="polite">
                Signing in…
              </span>
            ) : session ? (
              <>
                <Link
                  href="/dashboard"
                  className={cn(
                    "motion-safe:transition rounded-full border border-red-500/25 bg-red-950/35 px-4 py-2 text-sm font-semibold text-foreground shadow-[0_0_28px_-10px_rgba(220,38,38,0.45)] hover:border-red-400/35 hover:bg-red-950/50",
                    linkActive(pathname, "/dashboard") &&
                      "border-red-400/40 bg-red-950/55",
                  )}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="motion-safe:transition rounded-full px-3 py-2 text-sm text-muted hover:bg-surface hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
                className="motion-safe:transition rounded-full border border-red-500/25 bg-red-950/35 px-4 py-2 text-sm font-semibold text-foreground shadow-[0_0_28px_-10px_rgba(220,38,38,0.45)] hover:border-red-400/35 hover:bg-red-950/50"
              >
                Sign in
              </button>
            )}
          </div>

          <button
            type="button"
            className="motion-safe:transition flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface/80 text-foreground hover:border-red-500/20 hover:bg-surface-elevated md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <Icon icon="mdi:close" className="size-6" aria-hidden />
            ) : (
              <Icon icon="mdi:menu" className="size-6" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "mobile-nav-panel overflow-hidden border-t bg-background/95 md:hidden",
          "transition-[max-height,opacity] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          menuOpen
            ? "max-h-[min(80vh,32rem)] border-red-950/40 opacity-100"
            : "pointer-events-none max-h-0 border-transparent opacity-0",
        )}
        aria-hidden={!menuOpen}
        inert={menuOpen ? undefined : true}
      >
        <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={cn(
                  "motion-safe:transition rounded-xl px-3 py-3 text-sm font-medium",
                  linkActive(pathname, item.href)
                    ? "bg-surface-elevated text-foreground ring-1 ring-red-500/15"
                    : "text-muted hover:bg-surface hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            <hr className="my-2 border-surface-border" />
            {status === "loading" ? (
              <span className="px-3 py-2 text-sm text-muted" aria-live="polite">
                Signing in…
              </span>
            ) : session ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className={cn(
                    "motion-safe:transition rounded-xl px-3 py-3 text-sm font-semibold",
                    linkActive(pathname, "/dashboard")
                      ? "bg-red-950/40 text-foreground"
                      : "text-muted hover:bg-surface hover:text-foreground",
                  )}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    void signOut({ callbackUrl: "/" });
                  }}
                  className="motion-safe:transition rounded-xl px-3 py-3 text-left text-sm text-muted hover:bg-surface hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  void signIn("discord", { callbackUrl: "/dashboard" });
                }}
                className="motion-safe:transition rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground hover:bg-surface"
              >
                Sign in with Discord
              </button>
            )}
        </nav>
      </div>
    </header>
  );
}
