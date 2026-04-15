import { CommandsCatalog } from "@/components/commands-catalog";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { Card } from "@/components/ui/card";
import { getCommandCatalogMeta } from "@/lib/commands";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commands",
  description:
    "Arivix command reference — prefix commands synced from the live bot.",
};

export default async function CommandsPage() {
  const { categories } = await getCommandCatalogMeta();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 sm:gap-12 sm:px-6 sm:py-14 lg:px-8">
      <ScrollReveal
        as="header"
        className="border-b border-blue-950/30 pb-7 text-center sm:pb-8"
        amount={0.15}
      >
        <span
          className="mx-auto mb-3 block h-1 w-10 rounded-full bg-gradient-to-r from-edge/70 via-edge/30 to-transparent"
          aria-hidden
        />
        <h1 className="font-display text-3xl font-bold tracking-tight text-accent-strong sm:text-4xl">
          Commands
        </h1>
      </ScrollReveal>

      {categories.length === 0 ? (
        <ScrollReveal as="div" delay={0.04}>
          <Card
            padding="lg"
            className="border-dashed border-white/[0.12] bg-surface/30"
          >
            <p className="font-display text-lg font-semibold text-accent-strong">
              Command list unavailable
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              The bundled catalog failed to load. In Discord, use{" "}
              <code className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-mono text-xs">
                .help
              </code>{" "}
              for a link back here.
            </p>
          </Card>
        </ScrollReveal>
      ) : (
        <CommandsCatalog categories={categories} />
      )}

      {process.env.NODE_ENV === "development" ? (
        <ScrollReveal as="div" delay={0.08}>
          <Card
            padding="md"
            className="border-white/[0.06] bg-surface/40"
          >
          <p className="text-sm leading-relaxed text-muted">
            <strong className="text-foreground">Developers:</strong> command
            source lives in the <code className="font-mono text-xs">bot/</code>{" "}
            package in this repo.
          </p>
        </Card>
        </ScrollReveal>
      ) : null}
    </main>
  );
}
