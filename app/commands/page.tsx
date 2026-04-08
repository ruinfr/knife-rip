import { CommandsCatalog } from "@/components/commands-catalog";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { getCommandCatalogMeta } from "@/lib/commands";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commands",
  description:
    "Knife command reference — prefix commands synced from the live bot.",
};

export default async function CommandsPage() {
  const { categories, updatedAt, catalogSyncPending } =
    await getCommandCatalogMeta();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-14 sm:gap-14 sm:px-6 sm:py-20">
      <ScrollReveal as="header" className="border-b border-red-950/35 pb-10" amount={0.15}>
        <span
          className="mb-4 block h-1 w-10 rounded-full bg-gradient-to-r from-edge/70 via-edge/30 to-transparent"
          aria-hidden
        />
        <h1 className="font-display text-4xl font-bold tracking-tight text-accent-strong sm:text-5xl">
          Commands
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Knife uses the <strong className="text-foreground">.</strong> prefix
          (for example{" "}
          <code className="text-accent-strong">.help</code>). This list updates
          when the bot connects; the list is merged with the latest catalog so
          new commands still show if sync is delayed.
          {updatedAt ? (
            <>
              {" "}
              Last updated{" "}
              <time dateTime={updatedAt.toISOString()}>
                {updatedAt.toLocaleString()}
              </time>
              .
            </>
          ) : catalogSyncPending ? (
            <>
              {" "}
              Showing the bundled catalog until the bot syncs (no snapshot in
              the database yet).
            </>
          ) : null}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/tools/embed" variant="secondary">
            Embed builder
          </ButtonLink>
          <ButtonLink href="/pricing">Pricing &amp; Pro</ButtonLink>
          <ButtonLink href="/docs/permissions" variant="secondary">
            Permissions
          </ButtonLink>
        </div>
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
