import { KnifeEmbedBuilder } from "@/components/embed-builder/knife-embed-builder";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Icon } from "@/components/ui/icon";
import { siteMetadataBase } from "@/lib/site-url";
import type { Metadata } from "next";

const base = siteMetadataBase();

export const metadata: Metadata = {
  title: "Embed builder",
  description:
    "Build Knife {embed}$v scripts for .say and .createembed — variables, preview, and copy-ready output.",
  openGraph: {
    title: "Embed builder · Knife",
    description:
      "Build Knife {embed}$v scripts for Discord — variables and live preview.",
    url: `${base.origin}/tools/embed`,
  },
};

export default function EmbedBuilderPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 lg:px-8">
      <ScrollReveal
        as="header"
        className="border-b border-red-950/30 pb-6 sm:pb-7"
        amount={0.12}
      >
        <span
          className="mb-3 block h-1 w-10 rounded-full bg-gradient-to-r from-edge/70 via-edge/30 to-transparent"
          aria-hidden
        />
        <h1 className="flex flex-wrap items-center gap-3 font-display text-3xl font-bold tracking-tight text-accent-strong sm:text-4xl">
          <Icon
            icon="mdi:widgets-outline"
            className="size-9 shrink-0 text-edge sm:size-11"
            aria-hidden
          />
          Embed builder
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Compose a{" "}
          <code className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-mono text-sm text-edge">
            {"{embed}$v"}
          </code>{" "}
          script for{" "}
          <code className="font-mono text-sm text-accent-strong">.say</code> /{" "}
          <code className="font-mono text-sm text-accent-strong">
            .createembed
          </code>
          . The live panel mirrors Discord as you type — toggle{" "}
          <strong className="font-semibold text-foreground/90">sample data</strong>{" "}
          to see how variables resolve. Webhook JSON still works too.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
          <ButtonLink href="/commands" variant="secondary">
            <span className="inline-flex items-center gap-2">
              <Icon icon="mdi:console" className="size-4" aria-hidden />
              Commands
            </span>
          </ButtonLink>
          <ButtonLink href="/docs">
            <span className="inline-flex items-center gap-2">
              <Icon icon="mdi:book-open-variant" className="size-4" aria-hidden />
              Docs
            </span>
          </ButtonLink>
        </div>
      </ScrollReveal>

      <KnifeEmbedBuilder />
    </main>
  );
}
