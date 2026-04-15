import { HeroOrnament } from "@/components/decorative/hero-ornament";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/motion/stagger-children";
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
    key: "fallback-arivix-hub",
    name: "arivix.org",
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
    title: "Invite Arivix",
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
    body: "One-time $10 on your Discord account — Pro follows you everywhere you use Arivix.",
  },
] as const;

const faqs = [
  {
    q: "Is Arivix free?",
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
    a: "Email support@arivix.org or read Getting started in Docs for setup and billing.",
    href: "/docs/getting-started",
  },
] as const;

export const revalidate = 900;

export default async function Home() {
  let featuredCommunities: ShowcaseItem[] = SHOWCASE_FALLBACK;
  let liveCommunityCount = 0;
  let liveMemberCount = 0;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (botToken?.trim()) {
    try {
      const live = await fetchTopShowcaseCommunities(botToken, SHOWCASE_TOP_N);
      if (live.length > 0) {
        liveCommunityCount = live.length;
        liveMemberCount = live.reduce(
          (sum, g) => sum + Math.max(0, g.approximateMemberCount ?? 0),
          0,
        );
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
    detail: discordInvite ? "Invite Arivix" : "Add Arivix",
    href: discordInvite ?? "/docs/getting-started",
    showPlus: true,
  };

  const fallbackShowcase: ShowcaseItem[] = [
    ...featuredCommunities,
    yoursItem,
  ];

  const useLiveCarousel =
    showcaseFromBot && featuredCommunities.length > 0;
  const membersLabel = liveMemberCount > 0
    ? liveMemberCount.toLocaleString()
    : "23,686,779";
  const communitiesLabel = liveCommunityCount > 0
    ? liveCommunityCount.toLocaleString()
    : "165,719";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-16 px-4 py-12 sm:gap-20 sm:px-6 sm:py-16 lg:gap-22 lg:px-8">
      <ScrollReveal
        as="section"
        className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-14"
      >
        <div className="relative z-[1] min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-muted">
            Sharp stack · clean servers
          </p>
          <h1 className="font-display mt-4 max-w-[16ch] text-4xl font-bold leading-[1.04] text-accent-strong sm:text-5xl lg:text-[3.35rem]">
            <span className="bg-gradient-to-r from-edge via-[#93c5fd] to-edge/80 bg-clip-text text-transparent">
              Arivix
            </span>{" "}
            — one sharp Discord bot.
          </h1>
          <p className="mt-6 max-w-[35rem] text-[1.02rem] font-normal leading-relaxed tracking-tight text-muted sm:text-[1.08rem]">
            Cuts clutter and dull commands—serious mods and utilities, zero bloat.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2.5 sm:gap-3">
            {discordInvite ? (
              <ButtonLink
                href={discordInvite}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                className="gap-2 px-6 py-3.5 shadow-[0_0_36px_-14px_rgba(37,99,235,0.22)]"
              >
                <Icon
                  icon="mdi:discord"
                  aria-hidden
                  className="size-[1.125rem] text-edge"
                />
                Add Arivix
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
              className="gap-2 px-5 py-3.5"
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
              className="rounded-full px-4.5 text-foreground hover:text-edge"
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
              className="hidden px-3.5 text-muted sm:inline-flex"
            >
              Docs
            </ButtonLink>
          </div>
          <p className="mt-9 text-sm text-muted">
            Powering{" "}
            <span className="font-semibold text-foreground">{membersLabel}</span>{" "}
            users across{" "}
            <span className="font-semibold text-foreground">{communitiesLabel}</span>{" "}
            communities
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <HeroOrnament className="pointer-events-none absolute -right-6 -top-10 h-40 w-auto opacity-[0.42] sm:h-48 lg:right-2 lg:top-2 lg:h-56" />
          <div className="hero-backdrop hero-rim hero-sheen-live relative min-h-[292px] overflow-hidden rounded-[1.35rem] border border-white/[0.07] p-6 sm:min-h-[328px] sm:p-8">
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-blue-950/18 via-transparent to-transparent" />
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
      </ScrollReveal>

      <ScrollReveal
        as="section"
        className="border-t border-blue-950/30 pt-12 sm:pt-14"
        delay={0.05}
        aria-labelledby="proof-heading"
      >
        <div className="mx-auto w-full max-w-7xl px-1 sm:px-2">
          <p
            id="proof-heading"
            className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-muted"
          >
            Servers that keep their edge
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm font-normal leading-relaxed text-muted">
            {showcaseFromBot
              ? "Biggest Arivix guilds by member count."
              : "Communities running Arivix across the ecosystem."}
          </p>
          <div className="mt-8 flex w-full flex-col items-center justify-center gap-8 sm:gap-10">
            {useLiveCarousel ? (
              <div className="flex w-full flex-col items-center justify-center gap-10 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-12 sm:gap-y-10">
                <ShowcaseCarousel communities={featuredCommunities} />
                <ul className="m-0 flex shrink-0 list-none justify-center p-0">
                  <li className="w-[7.5rem]">
                    <ShowcaseTile s={yoursItem} interactive={false} />
                  </li>
                </ul>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-wrap items-start justify-center gap-[1.125rem] p-0 sm:gap-5">
                {fallbackShowcase.map((s) => (
                  <li key={s.key} className="w-[7.5rem]">
                    <ShowcaseTile s={s} interactive={false} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal
        as="section"
        delay={0.06}
        aria-labelledby="features-heading"
      >
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
              <Link
                href="/commands"
                className="font-medium text-edge underline-offset-4 hover:underline"
              >
                Commands
              </Link>
              .
            </p>
          </div>
        </div>
        <StaggerChildren className="grid auto-rows-fr gap-4 lg:grid-cols-3 lg:grid-rows-2">
          {features.map((f) => (
            <StaggerItem key={f.title} className={f.span}>
              <Card
                padding="lg"
                elevated
                className="h-full motion-safe:transition hover:border-white/[0.09]"
              >
                <div className="mb-3.5 h-px w-10 rounded-full bg-gradient-to-r from-edge/50 via-edge/25 to-transparent" />
                <h3 className="font-display text-lg font-semibold text-accent-strong">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm font-normal leading-relaxed text-muted">
                  {f.body}
                </p>
              </Card>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </ScrollReveal>

      <ScrollReveal
        as="section"
        aria-labelledby="how-heading"
        className="border-t border-blue-950/30 pt-14 sm:pt-16"
        delay={0.04}
      >
        <h2
          id="how-heading"
          className="font-display text-2xl font-bold tracking-tight text-accent-strong sm:text-3xl"
        >
          How it works
        </h2>
        <div className="relative mt-9">
          <div
            className="timeline-glow pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-blue-400/35 to-transparent sm:block"
            aria-hidden
          />
          <StaggerChildren className="grid gap-5 sm:grid-cols-3 sm:gap-6">
            {steps.map((s) => (
              <StaggerItem key={s.n}>
                <Card
                  padding="md"
                  className="relative h-full overflow-hidden motion-safe:transition hover:border-white/[0.09]"
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
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </ScrollReveal>

      <ScrollReveal
        as="section"
        aria-labelledby="faq-heading"
        className="border-t border-blue-950/30 pt-14 sm:pt-16"
        delay={0.04}
      >
        <h2
          id="faq-heading"
          className="font-display text-2xl font-bold tracking-tight text-accent-strong sm:text-3xl"
        >
          Quick answers
        </h2>
        <StaggerChildren
          as="ul"
          className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5"
        >
          {faqs.map((item) => (
            <StaggerItem key={item.q} as="li">
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
            </StaggerItem>
          ))}
        </StaggerChildren>
      </ScrollReveal>
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
