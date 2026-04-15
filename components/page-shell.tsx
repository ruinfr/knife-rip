import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type MaxWidth = "narrow" | "doc" | "wide";

const maxW: Record<MaxWidth, string> = {
  narrow: "max-w-xl",
  doc: "max-w-2xl",
  wide: "max-w-3xl",
};

type PageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  maxWidth?: MaxWidth;
  className?: string;
  /** e.g. back link above the title */
  prelude?: ReactNode;
};

export function PageShell({
  title,
  description,
  children,
  maxWidth = "doc",
  className,
  prelude,
}: PageShellProps) {
  return (
    <ScrollReveal
      as="main"
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20",
        maxW[maxWidth],
        className,
      )}
      amount={0.06}
    >
      {prelude ? (
        <div className="-mb-2 text-sm text-muted">{prelude}</div>
      ) : null}
      <header className="space-y-3 border-b border-blue-950/35 pb-8">
        <div className="flex flex-col gap-2">
          <span
            className="h-1 w-10 rounded-full bg-gradient-to-r from-edge/70 via-edge/30 to-transparent"
            aria-hidden
          />
          <h1 className="font-display text-3xl font-bold tracking-tight text-accent-strong sm:text-4xl">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="text-base leading-relaxed text-muted">{description}</p>
        ) : null}
      </header>
      <div className="prose-docs text-muted">{children}</div>
    </ScrollReveal>
  );
}
