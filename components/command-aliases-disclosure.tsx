"use client";

import type { BotCommand } from "@/lib/commands";
import { Icon } from "@/components/ui/icon";

type Props = {
  cmd: BotCommand;
  /** Display prefix, e.g. "." or "/" */
  invoke: string;
};

/** Collapsible shortcuts (aliases) — same command, shorter trigger names. */
export function CommandAliasesDisclosure({ cmd, invoke }: Props) {
  const aliases = (cmd.aliases ?? []).filter(
    (a) => a && a.toLowerCase() !== cmd.name.toLowerCase(),
  );
  if (aliases.length === 0) return null;

  return (
    <details className="cmd-aliases-details group mt-3 overflow-hidden rounded-lg border border-white/[0.06] bg-background/50 text-left">
      <summary className="cmd-aliases-summary flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-edge motion-safe:transition hover:bg-white/[0.03]">
        <span className="flex items-center gap-2">
          <Icon
            icon="mdi:chevron-down"
            className="cmd-aliases-chevron size-4 shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-300 motion-safe:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
            aria-hidden
          />
          Shortcuts
        </span>
        <span className="rounded-md bg-surface-elevated/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          {aliases.length}
        </span>
      </summary>
      <div className="cmd-aliases-panel border-t border-white/[0.06] px-3 py-3">
        <p className="mb-2 text-xs text-muted">Same command:</p>
        <ul className="flex flex-wrap gap-2">
          {aliases.map((a) => (
            <li key={a}>
              <code className="rounded-md bg-surface-elevated px-2 py-1 font-mono text-xs font-semibold text-accent-strong">
                {invoke}
                {a}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
