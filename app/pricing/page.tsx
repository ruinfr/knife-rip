import { CheckoutSubmitButton } from "@/components/checkout-submit-button";
import { ProCardFlourish } from "@/components/decorative/pro-card-flourish";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { resolveCommunityDiscordInviteUrl } from "@/lib/community-discord";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

const communityHubInvite = resolveCommunityDiscordInviteUrl();

export const metadata: Metadata = {
  title: "Pricing",
  description: "Knife Pro — $10 lifetime. One payment, no subscription.",
};

const freeBullets = [
  "Core prefix commands",
  "Community support",
  "Regular updates",
] as const;

const proBullets = [
  "Everything in Free",
  "Premium commands and higher limits (per bot)",
  "Priority consideration for feature requests",
  "Pay once — yours for the life of the product",
] as const;

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm text-muted">
      <Icon
        icon="mdi:check-circle"
        aria-hidden
        className="mt-0.5 size-[1.05rem] shrink-0 text-success"
      />
      <span>{children}</span>
    </li>
  );
}

export default function PricingPage() {
  const lifetimePriceId = process.env.STRIPE_PRICE_PRO_LIFETIME;
  const checkoutReady = Boolean(lifetimePriceId);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-14 sm:gap-16 sm:px-6 sm:py-20">
      <header className="reveal mx-auto max-w-2xl text-center">
        <span
          className="mx-auto mb-4 block h-1 w-10 rounded-full bg-gradient-to-r from-edge/70 via-edge/30 to-transparent"
          aria-hidden
        />
        <h1 className="font-display text-4xl font-bold tracking-tight text-accent-strong sm:text-5xl">
          Simple pricing
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          Knife Pro is a <strong className="text-foreground">one-time $10</strong>{" "}
          purchase on your Discord account — no monthly fee, no renewal. Use
          Pro everywhere you run the bot.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/commands" variant="secondary" className="gap-2">
            <Icon icon="mdi:format-list-bulleted" className="size-4" />
            Command list
          </ButtonLink>
          <ButtonLink
            href={communityHubInvite}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            className="gap-2"
          >
            <Icon icon="mdi:discord" className="size-4" />
            Discord hub
          </ButtonLink>
          <ButtonLink href="/docs/billing" variant="ghost" className="text-muted">
            Billing FAQ
          </ButtonLink>
        </div>
      </header>

      {!checkoutReady ? (
        <div
          role="status"
          className="reveal reveal-delay-1 mx-auto max-w-xl rounded-2xl border border-white/[0.08] bg-surface/50 px-5 py-4 text-center text-sm text-muted"
        >
          <p className="font-medium text-foreground">
            Pro checkout isn&apos;t available right now
          </p>
          <p className="mt-2 leading-relaxed">
            Check back soon or email{" "}
            <a
              href="mailto:support@knife.rip"
              className="font-medium text-edge underline-offset-4 hover:underline"
            >
              support@knife.rip
            </a>{" "}
            if you need Knife Pro.
          </p>
        </div>
      ) : null}

      <div className="reveal reveal-delay-1 grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
        <Card padding="lg" className="flex h-full flex-col">
          <div className="mb-4 h-px w-10 rounded-full bg-gradient-to-r from-muted/50 to-transparent" />
          <h2 className="font-display text-xl font-bold text-muted">Free</h2>
          <p className="mt-3 font-display text-4xl font-bold tabular-nums text-accent-strong sm:text-5xl">
            $0
          </p>
          <p className="mt-2 text-sm text-muted">Forever — no card required.</p>
          <ul className="mt-8 flex flex-1 flex-col gap-3">
            {freeBullets.map((t) => (
              <CheckItem key={t}>{t}</CheckItem>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <ButtonLink
              href="/docs/getting-started"
              variant="secondary"
              className="w-full justify-center sm:w-auto"
            >
              Get started
            </ButtonLink>
            <ButtonLink
              href="/commands"
              variant="ghost"
              className="w-full justify-center sm:w-auto"
            >
              Browse commands
            </ButtonLink>
          </div>
        </Card>

        <Card
          padding="lg"
          elevated
          surface="plain"
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-accent/20 bg-surface-elevated motion-safe:transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)] lg:min-h-[28rem] ring-1 ring-edge/20"
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-edge-muted/45 to-transparent"
            aria-hidden
          />
          <ProCardFlourish className="absolute right-0 top-0 z-0 h-28 w-28 opacity-90" />
          <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
            <span className="absolute right-5 top-5 rounded-full bg-edge-muted px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent-strong">
              Best value
            </span>
            <div className="mb-4 h-px w-10 rounded-full bg-gradient-to-r from-edge/50 to-transparent" />
            <h2 className="font-display pr-20 text-xl font-bold text-accent-strong">
              Knife Pro
            </h2>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-display text-5xl font-bold tabular-nums text-accent-strong sm:text-6xl">
                $10
              </span>
              <span className="text-sm font-medium text-muted">USD · once</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              Lifetime access on your Discord account. Secure checkout with
              Stripe — you&apos;ll get a receipt by email.
            </p>
            <ul className="mt-8 flex flex-1 flex-col gap-3">
              {proBullets.map((t) => (
                <CheckItem key={t}>{t}</CheckItem>
              ))}
            </ul>
            <div className="mt-10 space-y-3">
              <form action="/api/checkout" method="POST" className="w-full">
                <input type="hidden" name="priceId" value={lifetimePriceId ?? ""} />
                <CheckoutSubmitButton
                  disabled={!checkoutReady}
                  className="w-full justify-center py-3.5 text-base"
                />
              </form>
              <p className="text-center text-xs leading-relaxed text-muted">
                <Link
                  href="/api/auth/signin/discord?callbackUrl=/pricing"
                  className="font-medium text-edge underline-offset-4 hover:text-accent-strong hover:underline"
                >
                  Sign in with Discord
                </Link>{" "}
                first — checkout needs your account.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <section
        className="reveal reveal-delay-2 grid gap-4 border-t border-red-950/30 pt-12 sm:grid-cols-2"
        aria-labelledby="pricing-more-heading"
      >
        <h2 id="pricing-more-heading" className="sr-only">
          More resources
        </h2>
        <Card padding="md" className="motion-safe:transition hover:border-white/[0.09]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-surface/60 text-edge">
              <Icon icon="mdi:book-open-outline" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-foreground">
                Documentation
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Permissions, billing, and setup live in Docs.
              </p>
              <Link
                href="/docs"
                className="mt-3 inline-flex text-sm font-medium text-edge hover:underline"
              >
                Open Docs →
              </Link>
            </div>
          </div>
        </Card>
        <Card padding="md" className="motion-safe:transition hover:border-white/[0.09]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-surface/60 text-edge">
              <Icon icon="mdi:console-line" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-foreground">
                Commands
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                The live bot pushes its command list to the site; this page reads
                from that sync.
              </p>
              <Link
                href="/commands"
                className="mt-3 inline-flex text-sm font-medium text-edge hover:underline"
              >
                View commands →
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
