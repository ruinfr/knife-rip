import { HeroOrnament } from "@/components/decorative/hero-ornament";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ShowcaseCarousel } from "@/components/showcase-carousel";
import { ShowcaseTile, type ShowcaseTileItem } from "@/components/showcase-tile";
import { resolveCommunityDiscordInviteUrl } from "@/lib/community-discord";
import {
  fetchTopShowcaseCommunities,
  formatApproxMemberLabel,
  guildIconUrl,
} from "@/lib/discord";
import Link from "next/link";

const discordInvite = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;
const communityHubInvite = resolveCommunityDiscordInviteUrl();

/** Live communities pool (by member count); carousel shows 3 at a time. */
const SHOWCASE_TOP_N = 10;

type ShowcaseItem = ShowcaseTileItem;

const SHOWCASE_FALLBACK: ShowcaseItem[] = [
  {
    key: "fallback-knife-hub",
    name: "knife.rip",
    detail: "Official hub · roles & support",
    href: communityHubInvite,
    image: "/showcase/ak.png",
  },
];

const floaters = [
  {
    icon: "mdi:shield-sword",
    title: "Mod edge",
    body: "Hard filters, clean logs—nothing soft, nothing silly.",
  },
  {
    icon: "mdi:hammer-wrench",
    title: "Utility honed",
    body: "Roles, QoL, and speed tuned for how you actually run a server.",
  },
  {
    icon: "mdi:star-four-points",
    title: "Pro edge",
    body: "Premium limits when you want the blade turned up.",
  },
] as const;

const features = [
  {
    title: "Moderation",
    body: "Cuts through noise without bloating your mod stack into a spreadsheet.",
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    title: "Utilities",
    body: "Day-to-day commands with a clean edge—fast for mods, light for members.",
    span: "lg:col-span-1",
  },
  {
    title: "Engagement",
    body: "Hooks with a point—intentional, not spammy growth hacks.",
    span: "lg:col-span-1",
  },
] as const;

const steps = [
  {
    n: "01",
    title: "Invite Knife",
    body: "Add the bot to your server from the homepage or Docs. You need permission to manage the server.",
  },
  {
    n: "02",
    title: "Use it",
    body: "Commands use the . prefix today (e.g. .help). See the full list on the Commands page after the bot has synced.",
  },
  {
    n: "03",
    title: "Go Pro (optional)",
    body: "One-time $10 on your Discord account — Pro follows you everywhere you use Knife.",
  },
] as const;

const faqs = [
  {
    q: "Is Knife free?",
    a: "Core features are free. Pro is a $10 lifetime unlock for premium commands and limits — see Pricing.",
    href: "/pricing",
  },
  {
    q: "Where do I manage billing?",
    a: "Sign in with Discord, open Dashboard, then Billing history (Stripe) for receipts.",
    href: "/docs/billing",
  },
  {
    q: "How do I get help?",
    a: "Email support@knife.rip or read Getting started in Docs for setup and billing.",
    href: "/docs/getting-started",
  },
] as const;

export const revalidate = 900;

export default async function Home() {
  let featuredCommunities: ShowcaseItem[] = SHOWCASE_FALLBACK;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (botToken?.trim()) {
    try {
      const live = await fetchTopShowcaseCommunities(botToken, SHOWCASE_TOP_N);
      if (live.length > 0) {
        featuredCommunities = live.map((g) => ({
          key: g.id,
          name: g.name,
          detail: formatApproxMemberLabel(g.approximateMemberCount),
          href: g.href,
          image: guildIconUrl(g.id, g.icon, 128) ?? undefined,
        }));
      }
    } catch {
      featuredCommunities = SHOWCASE_FALLBACK;
    }
  }

  const showcaseFromBot = featuredCommunities.some(
    (c) => !c.key.startsWith("fallback-"),
  );

  const yoursItem: ShowcaseItem = {
    key: "yours",
    name: "Your server",
    detail: discordInvite ? "Invite Knife" : "Add Knife",
    href: discordInvite ?? "/docs/getting-started",
    showPlus: true,
  };

  const fallbackShowcase: ShowcaseItem[] = [
    ...featuredCommunities,
    yoursItem,
  ];

  const useLiveCarousel =
    showcaseFromBot && featuredCommunities.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-14 sm:gap-20 sm:px-6 sm:py-20 lg:gap-22">
      <section className="reveal grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-12">
        <div className="relative z-[1] min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-muted">
            Sharp stack · clean servers
          </p>
          <h1 className="font-display mt-4 text-4xl font-bold leading-[1.06] text-accent-strong sm:text-5xl lg:text-[3.05rem]">
            <span className="bg-gradient-to-r from-edge via-[#fca5a5] to-edge/80 bg-clip-text text-transparent">
              Knife
            </span>{" "}
            — one sharp Discord bot.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.05rem] font-normal leading-relaxed tracking-tight text-muted sm:text-lg">
            Cuts clutter and dull commands—serious mods and utilities, zero bloat.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {discordInvite ? (
              <ButtonLink
                href={discordInvite}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                className="gap-2 px-6 py-3 shadow-[0_0_36px_-14px_rgba(220,38,38,0.22)]"
              >
                <Icon
                  icon="mdi:discord"
                  aria-hidden
                  className="size-[1.125rem] text-edge"
                />
                Add Knife
              </ButtonLink>
            ) : (
              <ButtonLink
                href="/docs/getting-started"
                variant="secondary"
                className="px-6 py-3"
              >
                Get started
              </ButtonLink>
            )}
            <ButtonLink
              href={communityHubInvite}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              className="gap-2 px-5 py-3"
            >
              <Icon
                icon="mdi:discord"
                aria-hidden
                className="size-[1.125rem] text-edge"
              />
              Community hub
            </ButtonLink>
            <ButtonLink
              href="/pricing"
              variant="ghost"
              className="rounded-full px-5 text-foreground hover:text-edge"
            >
              View pricing{" "}
              <Icon
                icon="tabler:chevron-right"
                aria-hidden
                className="ml-0.5 inline size-4 opacity-60"
              />
            </ButtonLink>
            <ButtonLink
              href="/docs"
              variant="ghost"
              className="hidden px-4 text-muted sm:inline-flex"
            >
              Docs
            </ButtonLink>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <HeroOrnament className="pointer-events-none absolute -right-6 -top-10 h-40 w-auto opacity-[0.42] sm:h-48 lg:right-2 lg:top-2 lg:h-56" />
          <div className="hero-backdrop hero-rim hero-sheen-live relative min-h-[292px] overflow-hidden rounded-[1.35rem] border border-white/[0.07] p-6 sm:min-h-[328px] sm:p-8">
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-red-950/18 via-transparent to-transparent" />
            <div className="relative flex flex-col gap-3.5 pt-1">
              {floaters.map((f, i) => (
                <div
                  key={f.title}
                  className="float-soft"
                  style={{
                    animationDelay: `${i * 0.45}s`,
                    ["--float-dur" as string]: `${7.5 + i * 1.1}s`,
                  }}
                >
                  <div className={cnFloater(i)}>
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-surface/60 ring-1 ring-inset ring-white/[0.04]"
                      aria-hidden
                    >
                      <Icon icon={f.icon} className="size-5 text-edge" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[0.8125rem] font-semibold text-foreground">
                        {f.title}
                      </p>
                      <p className="mt-1 text-[0.8125rem] leading-snug text-muted">
                        {f.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="reveal reveal-delay-1 border-t border-red-950/30 pt-14 sm:pt-16"
        aria-labelledby="proof-heading"
      >
        <div className="mx-auto w-full max-w-6xl px-4">
          <p
            id="proof-heading"
            className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-muted"
          >
            Servers that keep their edge
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm font-normal leading-relaxed text-muted">
            {showcaseFromBot
              ? "Biggest Knife guilds by member count—step in or put the bot on yours."
              : "Communities running Knife—join them or add the blade to your server."}
          </p>
          <div className="mt-10 flex w-full flex-col items-center justify-center gap-10 sm:gap-12">
            {useLiveCarousel ? (
              <div className="flex w-full flex-col items-center justify-center gap-10 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-12 sm:gap-y-10">
                <ShowcaseCarousel communities={featuredCommunities} />
                <ul className="m-0 flex shrink-0 list-none justify-center p-0">
                  <li className="w-[7.5rem]">
                    <ShowcaseTile s={yoursItem} />
                  </li>
                </ul>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-wrap items-start justify-center gap-[1.125rem] p-0 sm:gap-5">
                {fallbackShowcase.map((s) => (
                  <li key={s.key} className="w-[7.5rem]">
                    <ShowcaseTile s={s} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="reveal reveal-delay-2" aria-labelledby="features-heading">
        <div className="mb-7 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="features-heading"
              className="font-display text-2xl font-bold tracking-tight text-accent-strong sm:text-3xl"
            >
              Honed for real servers
            </h2>
            <p className="mt-2 max-w-lg text-sm font-normal leading-relaxed text-muted">
              Moderation, utilities, and engagement—without the bloat. See live commands on{" "}
              <Link href="/commands" className="font-medium text-edge underline-offset-4 hover:underline">
                Commands
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="grid auto-rows-fr gap-4 lg:grid-cols-3 lg:grid-rows-2">
          {features.map((f) => (
            <Card
              key={f.title}
              padding="lg"
              elevated
              className={`motion-safe:transition hover:border-white/[0.09] ${f.span}`}
            >
              <div className="mb-3.5 h-px w-10 rounded-full bg-gradient-to-r from-edge/50 via-edge/25 to-transparent" />
              <h3 className="font-display text-lg font-semibold text-accent-strong">
                {f.title}
              </h3>
              <p className="mt-3 text-sm font-normal leading-relaxed text-muted">
                {f.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="how-heading"
        className="reveal reveal-delay-3 border-t border-red-950/30 pt-14 sm:pt-16"
      >
        <h2
          id="how-heading"
          className="font-display text-2xl font-bold tracking-tight text-accent-strong sm:text-3xl"
        >
          How it works
        </h2>
        <div className="relative mt-9 grid gap-5 sm:grid-cols-3 sm:gap-6">
          <div
            className="timeline-glow pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-red-400/35 to-transparent sm:block"
            aria-hidden
          />
          {steps.map((s) => (
            <Card
              key={s.n}
              padding="md"
              className="relative overflow-hidden motion-safe:transition hover:border-white/[0.09]"
            >
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-edge/75">
                {s.n}
              </span>
              <h3 className="mt-2.5 font-display text-base font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm font-normal leading-relaxed text-muted">
                {s.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="faq-heading"
        className="reveal reveal-delay-4 border-t border-red-950/30 pt-14 sm:pt-16"
      >
        <h2
          id="faq-heading"
          className="font-display text-2xl font-bold tracking-tight text-accent-strong sm:text-3xl"
        >
          Quick answers
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {faqs.map((item) => (
            <li key={item.q}>
              <Card
                padding="md"
                className="h-full motion-safe:transition hover:border-white/[0.09]"
              >
                <p className="font-medium tracking-tight text-foreground">
                  {item.q}
                </p>
                <p className="mt-2 text-sm font-normal leading-relaxed text-muted">
                  {item.a}
                </p>
                <Link
                  href={item.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-edge/90 hover:text-edge motion-safe:transition"
                >
                  Learn more
                  <Icon
                    icon="tabler:arrow-right"
                    aria-hidden
                    className="size-4 opacity-80"
                  />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function cnFloater(index: number) {
  const rotations = ["-rotate-[1.25deg]", "rotate-[1deg]", "-rotate-[0.75deg]"];
  const offsets = ["sm:translate-x-0", "sm:translate-x-1.5", "sm:-translate-x-1"];
  return [
    "floater-tile float-soft-inner motion-safe:transition flex gap-3.5 px-4 py-3.5",
    rotations[index % rotations.length],
    offsets[index % offsets.length],
  ].join(" ");
}
