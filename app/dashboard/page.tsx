import { auth } from "@/auth";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/motion/stagger-children";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { resolveCommunityDiscordInviteUrl } from "@/lib/community-discord";
import { db } from "@/lib/db";
import { getDashboardGuildSummary, guildIconUrl } from "@/lib/discord";
import { isDeveloperDiscordId } from "@/lib/bot-developers";
import {
  isPremiumBypassDiscordIdResolved,
  isRegularOwnerResolved,
} from "@/lib/discord-privilege";
import { hasPremiumAccessWithDiscordAccount } from "@/lib/premium";
import { guildNameInitial } from "@/lib/guild-name-initial";
import Link from "next/link";

const discordInvite = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL;
const communityHubInvite = resolveCommunityDiscordInviteUrl();

function firstQuery(
  v: string | string[] | undefined,
): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const sp = searchParams ? await searchParams : {};
  const checkout = firstQuery(sp.checkout);
  const pro = firstQuery(sp.pro);
  const billing = firstQuery(sp.billing);

  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  });

  const account = await db.account.findFirst({
    where: { userId: session.user.id, provider: "discord" },
  });

  const botToken = process.env.DISCORD_BOT_TOKEN;

  let summary: Awaited<ReturnType<typeof getDashboardGuildSummary>> | null =
    null;
  let guildError: string | null = null;

  if (account?.access_token) {
    try {
      summary = await getDashboardGuildSummary(account.access_token, botToken);
    } catch {
      guildError =
        "Could not load servers. Try signing out and signing in again to refresh Discord access.";
    }
  } else {
    guildError = "No Discord token on file. Sign out and sign in again.";
  }

  const discordId = account?.providerAccountId;
  const premiumActive = await hasPremiumAccessWithDiscordAccount(
    user,
    discordId,
  );
  const bypassPro =
    discordId != null &&
    !user?.lifetimePremiumAt &&
    (await isPremiumBypassDiscordIdResolved(discordId));
  const isDeveloper =
    discordId != null && isDeveloperDiscordId(discordId);
  const isRegularOwner =
    discordId != null && (await isRegularOwnerResolved(discordId));
  const premiumLabel = !premiumActive
    ? "Not purchased"
    : user?.lifetimePremiumAt
      ? "Lifetime Pro"
      : bypassPro
        ? "Arivix Pro"
        : "Active";

  const knifeGuilds = summary?.knifeGuilds ?? [];
  const inviteCandidates = summary?.inviteCandidates ?? [];
  const botConfigured = summary?.botConfigured ?? false;

  const showCheckoutThanks = checkout === "success" && premiumActive;
  const showCheckoutPending =
    checkout === "success" && !premiumActive;
  const showAlreadyPro = pro === "already";
  const showBillingError = billing === "error";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      {showBillingError ? (
        <ScrollReveal
          as="div"
          role="alert"
          className="rounded-xl border border-blue-500/30 bg-blue-950/25 px-4 py-3 text-sm text-foreground/95"
          amount={0.12}
        >
          <p className="font-medium text-accent-strong">
            Billing portal unavailable
          </p>
          <p className="mt-1 text-muted">
            Stripe could not open just now. Try again in a few minutes or email{" "}
            <a
              href="mailto:support@arivix.org"
              className="font-medium text-edge underline-offset-2 hover:underline"
            >
              support@arivix.org
            </a>
            .
          </p>
        </ScrollReveal>
      ) : null}

      {showAlreadyPro ? (
        <ScrollReveal
          as="div"
          role="status"
          className="rounded-xl border border-edge/25 bg-edge-muted/30 px-4 py-3 text-sm text-foreground/95"
          amount={0.12}
        >
          <p className="font-medium text-accent-strong">
            You already have Arivix Pro
          </p>
          <p className="mt-1 text-muted">
            No need to check out again — Pro is tied to this Discord account.
          </p>
        </ScrollReveal>
      ) : null}

      {showCheckoutThanks ? (
        <ScrollReveal
          as="div"
          role="status"
          className="rounded-xl border border-success-border bg-success-muted px-4 py-3 text-sm text-foreground/95"
          amount={0.12}
        >
          <p className="font-medium text-success-foreground">
            Thanks — Arivix Pro is active
          </p>
          <p className="mt-1 text-muted">
            You can use Pro features everywhere you run the bot. Receipts are
            in your email from Stripe.
          </p>
        </ScrollReveal>
      ) : null}

      {showCheckoutPending ? (
        <ScrollReveal
          as="div"
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-sm text-foreground/95"
          amount={0.12}
        >
          <p className="font-medium text-amber-100/95">
            Finishing your purchase…
          </p>
          <p className="mt-1 text-muted">
            If Pro still shows as inactive after a minute, refresh this page or
            contact support — the webhook may still be processing.
          </p>
        </ScrollReveal>
      ) : null}

      <ScrollReveal as="div" delay={0.03} amount={0.1}>
        <Card
          padding="lg"
          elevated
          className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
        >
        <div className="flex items-center gap-4">
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt=""
              className="h-14 w-14 rounded-full border border-surface-border"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-surface-border text-muted">
              ?
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-accent-strong">
                {session.user.name ?? "Discord user"}
              </h1>
              {isDeveloper ? (
                <span className="inline-flex items-center rounded-full border border-violet-500/45 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                  Developer
                </span>
              ) : isRegularOwner ? (
                <span className="inline-flex items-center rounded-full border border-edge/40 bg-edge-muted/35 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-edge">
                  Owner
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-sm text-muted">
              Pro:{" "}
              <span className="text-foreground">{premiumLabel}</span>
            </p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted">
              <a
                href={communityHubInvite}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-edge underline decoration-edge/40 underline-offset-2 hover:decoration-edge"
              >
                Join the arivix.org Discord hub
              </a>{" "}
              so Pro, owner, and developer roles can sync to your account.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.stripeCustomerId ? (
            <form action="/api/billing/portal" method="POST">
              <Button type="submit" variant="secondary">
                Billing history
              </Button>
            </form>
          ) : null}
          {!premiumActive ? (
            <ButtonLink href="/pricing">Get Pro — $10</ButtonLink>
          ) : null}
        </div>
      </Card>
      </ScrollReveal>

      <ScrollReveal as="section" delay={0.035} amount={0.08}>
        <Card
          padding="md"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Arivix Cash
            </h2>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
              Play on the web with the same wallet and leaderboards as Discord
              (after signing in with Discord).
            </p>
          </div>
          <ButtonLink href="/knife-cash">Open Arivix Cash</ButtonLink>
        </Card>
      </ScrollReveal>

      <ScrollReveal as="section" className="space-y-4" delay={0.04} amount={0.08}>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Servers with Arivix
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
            Only guilds where you can manage the server and Arivix is installed
            show here. Open one to work on that server&apos;s dashboard.
          </p>
        </div>

        {!botConfigured && !guildError ? (
          <Card
            padding="md"
            className="border-amber-500/25 bg-amber-500/[0.06] text-sm leading-relaxed text-foreground/90"
          >
            <p className="font-medium text-amber-100/95">
              Connect your bot token
            </p>
            <p className="mt-2 text-muted">
              Set <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px] text-edge/90">DISCORD_BOT_TOKEN</code>{" "}
              in your environment (Bot token from the Discord application — same
              app as the OAuth client). The site uses it to see which servers
              Arivix has joined, and never exposes it to the browser.
            </p>
          </Card>
        ) : null}

        {guildError ? (
          <Card
            padding="md"
            className="border-warning-border bg-warning-muted text-sm text-warning-foreground"
          >
            {guildError}
          </Card>
        ) : botConfigured && knifeGuilds.length === 0 ? (
          <Card padding="md" className="text-sm text-muted">
            <p>
              Arivix isn&apos;t in any servers you manage yet, or Discord
              hasn&apos;t returned an updated guild list.{" "}
              {discordInvite ? (
                <>
                  Use{" "}
                  <Link
                    href={discordInvite}
                    className="font-medium text-edge underline decoration-edge/40 underline-offset-2 hover:decoration-edge"
                  >
                    Invite Arivix
                  </Link>{" "}
                  on a server where you have Manage Server.
                </>
              ) : (
                "Add the invite link to your env to invite the bot from here."
              )}
            </p>
          </Card>
        ) : (
          <StaggerChildren as="ul" className="space-y-2">
            {knifeGuilds.map((g) => {
              const icon = guildIconUrl(g.id, g.icon);
              return (
                <StaggerItem as="li" key={g.id}>
                  <Link
                    href={`/dashboard/${g.id}`}
                    className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Card
                      padding="md"
                      className="flex items-center gap-3 motion-safe:transition hover:border-white/[0.12] hover:bg-surface-elevated/40"
                    >
                      {icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={icon}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-white/[0.06]"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-border font-display text-lg font-semibold text-muted ring-1 ring-white/[0.06]">
                          {guildNameInitial(g.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground group-hover:text-edge">
                          {g.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          Manage server · Arivix active
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-lg text-muted motion-safe:transition group-hover:translate-x-0.5 group-hover:text-edge"
                        aria-hidden
                      >
                        →
                      </span>
                    </Card>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        )}
      </ScrollReveal>

      {!guildError && inviteCandidates.length > 0 ? (
        <ScrollReveal as="section" className="space-y-3" delay={0.05} amount={0.08}>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Add Arivix elsewhere
            </h2>
            <p className="mt-1 text-sm text-muted">
              You manage these servers, but Arivix isn&apos;t a member yet.
            </p>
          </div>
          <ul className="space-y-2">
            {inviteCandidates.map((g) => {
              const icon = guildIconUrl(g.id, g.icon);
              return (
                <li key={g.id}>
                  <Card
                    padding="sm"
                    className="flex items-center gap-3 border-white/[0.04] bg-surface/40"
                  >
                    {icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={icon}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg opacity-90"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-border font-display text-sm font-semibold text-muted">
                        {guildNameInitial(g.name)}
                      </div>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">
                      {g.name}
                    </span>
                    {discordInvite ? (
                      <ButtonLink
                        href={discordInvite}
                        variant="secondary"
                        className="shrink-0 rounded-xl px-3 py-1.5 text-xs"
                      >
                        Invite
                      </ButtonLink>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        </ScrollReveal>
      ) : null}
    </main>
  );
}
