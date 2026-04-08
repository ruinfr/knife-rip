"use client";

import { CommandAliasesDisclosure } from "@/components/command-aliases-disclosure";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { BotCommand, CommandCategory } from "@/lib/commands";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

const USAGE_ICON_PATTERN = /\{\{([a-z0-9]+:[a-z0-9-]+)\}\}/gi;

/** Map common usage emojis to Iconify slugs so DB/bot text still renders as icons on the site. */
function usageEmojisToIconTokens(raw: string): string {
  return raw
    .replace(/🔒\uFE0F?/g, "{{mdi:lock}}")
    .replace(/👻\uFE0F?/g, "{{mdi:ghost-outline}}")
    .replace(/➕\uFE0F?/g, "{{mdi:plus}}")
    .replace(/✏️|✏\uFE0F?/g, "{{mdi:pencil}}");
}

function CommandUsageDisplay({ text }: { text: string }) {
  const normalized = usageEmojisToIconTokens(text);
  const matches = [...normalized.matchAll(USAGE_ICON_PATTERN)];
  if (matches.length === 0) {
    return (
      <pre className="mt-3 overflow-x-auto rounded-lg border border-white/[0.06] bg-background/80 p-3 font-mono text-xs leading-relaxed text-accent">
        {normalized}
      </pre>
    );
  }

  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of matches) {
    const start = m.index ?? 0;
    if (start > last) {
      parts.push(<span key={`t-${i++}`}>{normalized.slice(last, start)}</span>);
    }
    const slug = m[1];
    parts.push(
      <Icon
        key={`t-${i++}`}
        icon={slug}
        className="mx-0.5 inline size-[0.95rem] shrink-0 align-[-0.15em] text-edge/90"
        aria-hidden
      />,
    );
    last = start + m[0].length;
  }
  if (last < normalized.length) {
    parts.push(<span key={`t-${i++}`}>{normalized.slice(last)}</span>);
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-white/[0.06] bg-background/80 p-3 font-mono text-xs leading-relaxed text-accent">
      <span className="inline">{parts}</span>
    </div>
  );
}

function invokePrefix(cmd: BotCommand): string {
  return cmd.style === "slash" ? "/" : ".";
}

function tokenizeQuery(raw: string): string[] {
  return raw
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function commandMatches(
  cmd: BotCommand,
  category: CommandCategory,
  tokens: string[],
): boolean {
  if (tokens.length === 0) return true;
  const blob = [
    cmd.name,
    ...(cmd.aliases ?? []),
    cmd.description,
    cmd.usage ?? "",
    category.id,
    category.title,
    category.description,
    cmd.developerOnly ? "developer" : "",
  ]
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => blob.includes(t));
}

type Props = {
  categories: CommandCategory[];
};

const CATEGORY_TAB_ICONS: Record<string, string> = {
  core: "mdi:console",
  information: "mdi:information-outline",
  utility: "mdi:wrench-outline",
  moderation: "mdi:shield-outline",
  fun: "mdi:emoticon-happy-outline",
  economy: "mdi:currency-usd",
  roleplay: "mdi:account-group-outline",
};

function categoryTabIcon(id: string): string {
  return CATEGORY_TAB_ICONS[id] ?? "mdi:folder-outline";
}

export function CommandsCatalog({ categories }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const tokens = tokenizeQuery(query);
    return categories
      .map((cat) => ({
        ...cat,
        commands: cat.commands.filter((cmd) =>
          commandMatches(cmd, cat, tokens),
        ),
      }))
      .filter((cat) => cat.commands.length > 0);
  }, [categories, query]);

  const totalVisible = useMemo(
    () => filtered.reduce((n, c) => n + c.commands.length, 0),
    [filtered],
  );

  const tabCounts = useMemo(() => {
    const source = query.trim() ? filtered : categories;
    const total = source.reduce((n, c) => n + c.commands.length, 0);
    const perCat = source.map((c) => ({
      id: c.id,
      title: c.title,
      count: c.commands.length,
    }));
    return { total, perCat };
  }, [categories, filtered, query]);

  const effectiveCategory = useMemo(() => {
    if (activeCategory === "all") return "all";
    const hit = filtered.find((c) => c.id === activeCategory);
    if (hit && hit.commands.length > 0) return activeCategory;
    return "all";
  }, [activeCategory, filtered]);

  const visibleCategories = useMemo(() => {
    if (effectiveCategory === "all") return filtered;
    return filtered.filter((c) => c.id === effectiveCategory);
  }, [filtered, effectiveCategory]);

  const scrollToCategory = (id: string) => {
    if (id === "all") return;
    document
      .getElementById(`cmd-cat-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="relative max-w-xl">
        <label htmlFor="cmd-search" className="sr-only">
          Search commands
        </label>
        <Icon
          icon="mdi:magnify"
          className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id="cmd-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, alias, description, or usage…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-white/[0.08] bg-background/85 py-3 pl-11 pr-11 font-sans text-sm text-foreground shadow-inner shadow-black/20 placeholder:text-muted/70 outline-none ring-edge/25 transition focus:border-edge/35 focus:ring-2"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Clear search"
          >
            <Icon icon="mdi:close-circle" className="size-5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Categories
        </p>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" />
          <div className="flex items-center gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => {
                setActiveCategory("all");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={cn(
                "motion-safe:transition flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold",
                effectiveCategory === "all"
                  ? "border-white/[0.12] bg-surface-elevated/95 text-foreground shadow-sm ring-1 ring-white/[0.06]"
                  : "border-transparent bg-surface/55 text-muted hover:bg-white/[0.05] hover:text-foreground",
              )}
            >
              all
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] tabular-nums",
                  effectiveCategory === "all"
                    ? "bg-background/80 text-muted"
                    : "bg-background/50 text-muted",
                )}
              >
                {tabCounts.total}
              </span>
            </button>
            {tabCounts.perCat.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCategory(c.id);
                  scrollToCategory(c.id);
                }}
                className={cn(
                  "motion-safe:transition flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold",
                  effectiveCategory === c.id
                    ? "border-white/[0.12] bg-surface-elevated/95 text-foreground shadow-sm ring-1 ring-white/[0.06]"
                    : "border-transparent bg-surface/55 text-muted hover:bg-white/[0.05] hover:text-foreground",
                )}
              >
                <Icon
                  icon={categoryTabIcon(c.id)}
                  className="size-4 shrink-0 opacity-80"
                  aria-hidden
                />
                <span className="max-w-[10rem] truncate">{c.title}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] tabular-nums",
                    effectiveCategory === c.id
                      ? "bg-background/80 text-muted"
                      : "bg-background/50 text-muted",
                  )}
                >
                  {c.count}
                </span>
              </button>
            ))}
            <span
              className="mx-1 shrink-0 text-muted/80"
              aria-hidden
              title="Scroll for more"
            >
              <Icon icon="mdi:chevron-right" className="size-5" />
            </span>
          </div>
        </div>
      </div>

      {query.trim() && totalVisible === 0 ? (
        <Card
          padding="lg"
          className="border-dashed border-white/[0.12] bg-surface/30"
        >
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-background/60">
              <Icon
                icon="tabler:search-off"
                className="size-7 text-muted"
                aria-hidden
              />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-accent-strong">
                No commands match
              </p>
              <p className="mt-1 text-sm text-muted">
                Try another keyword, or clear the search to see the full list.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-14">
        {visibleCategories.map((cat) => (
          <ScrollReveal
            as="section"
            key={cat.id}
            id={cat.id}
            className="scroll-mt-24"
            aria-labelledby={`cmd-cat-${cat.id}`}
            amount={0.05}
          >
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id={`cmd-cat-${cat.id}`}
                  className="font-display text-2xl font-bold tracking-tight text-accent-strong"
                >
                  {cat.title}
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                  {cat.description}
                </p>
              </div>
              {query.trim() ? (
                <p className="text-xs text-muted">
                  {cat.commands.length} match
                  {cat.commands.length === 1 ? "" : "es"}
                </p>
              ) : null}
            </div>
            <ul className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
              {cat.commands.map((cmd) => {
                const p = invokePrefix(cmd);
                return (
                  <li key={`${cat.id}-${cmd.name}`}>
                    <Card
                      padding="md"
                      className="h-full motion-safe:transition hover:border-white/[0.1]"
                    >
                      <div className="flex flex-wrap items-center gap-2 gap-y-1">
                        <code className="rounded-md bg-surface-elevated px-2 py-1 font-mono text-sm font-semibold text-edge">
                          {p}
                          {cmd.name}
                        </code>
                        {cmd.developerOnly ? (
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200/95">
                            Developer
                          </span>
                        ) : null}
                        {cmd.tier === "pro" ? (
                          <span className="rounded-full bg-edge-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-strong">
                            Premium
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                            Free
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-muted">
                        {cmd.description}
                      </p>
                      {cmd.usage ? (
                        <CommandUsageDisplay text={cmd.usage} />
                      ) : null}
                      <CommandAliasesDisclosure cmd={cmd} invoke={p} />
                    </Card>
                  </li>
                );
              })}
            </ul>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
