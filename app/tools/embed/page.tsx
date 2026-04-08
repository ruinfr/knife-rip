import { KnifeEmbedBuilder } from "@/components/embed-builder/knife-embed-builder";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { ButtonLink } from "@/components/ui/button-link";
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-20">
      <ScrollReveal as="header" className="border-b border-red-950/35 pb-8" amount={0.12}>
        <span
          className="mb-4 block h-1 w-10 rounded-full bg-gradient-to-r from-edge/70 via-edge/30 to-transparent"
          aria-hidden
        />
        <h1 className="font-display text-4xl font-bold tracking-tight text-accent-strong sm:text-5xl">
          Embed builder
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Compose a{" "}
          <code className="rounded-md bg-surface-elevated px-1.5 py-0.5 font-mono text-sm text-edge">
            {"{embed}$v"}
          </code>{" "}
          script for{" "}
          <code className="font-mono text-sm text-accent-strong">.say</code> /{" "}
          <code className="font-mono text-sm text-accent-strong">
            .createembed
          </code>
          . Variables expand when the bot sends the message (same context as the
          staff member running the command). Webhook JSON still works too.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/commands" variant="secondary">
            Commands
          </ButtonLink>
          <ButtonLink href="/docs">Docs</ButtonLink>
        </div>
      </ScrollReveal>

      <KnifeEmbedBuilder />
    </main>
  );
}
