import type { BotCommand } from "@/lib/commands";

type Props = {
  cmd: BotCommand;
  /** Display prefix, e.g. "." or "/" */
  invoke: string;
};

/** Renders shortcut triggers (aliases) — always visible so users don’t miss `.cf`, `.ig`, etc. */
export function CommandAliasesDisclosure({ cmd, invoke }: Props) {
  const aliases = (cmd.aliases ?? []).filter(
    (a) => a && a.toLowerCase() !== cmd.name.toLowerCase(),
  );
  if (aliases.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-white/[0.06] bg-background/50 px-3 py-2.5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Shortcuts
      </p>
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
  );
}
