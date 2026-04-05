import { auth } from "@/auth";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getKnifeGuildForUser, guildIconUrl } from "@/lib/discord";
import {
  isBotOwnerDiscordIdResolved,
  isPremiumBypassDiscordIdResolved,
} from "@/lib/discord-privilege";
import { hasPremiumAccessWithDiscordAccount } from "@/lib/premium";
import { guildNameInitial } from "@/lib/guild-name-initial";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ guildId: string }> };

export default async function GuildDashboardPage({ params }: PageProps) {
  const { guildId } = await params;

  const session = await auth();
  if (!session?.user?.id) return null;

  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!botToken) {
    redirect("/dashboard");
  }

  const account = await db.account.findFirst({
    where: { userId: session.user.id, provider: "discord" },
  });

  if (!account?.access_token) {
    redirect("/dashboard");
  }

  let guild: Awaited<ReturnType<typeof getKnifeGuildForUser>> = null;
  try {
    guild = await getKnifeGuildForUser(
      account.access_token,
      botToken,
      guildId,
    );
  } catch {
    redirect("/dashboard");
  }

  if (!guild) {
    redirect("/dashboard");
  }

  const icon = guildIconUrl(guild.id, guild.icon, 128);
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  });
  const discordId = account?.providerAccountId;
  const premiumActive = await hasPremiumAccessWithDiscordAccount(
    user,
    discordId,
  );
  const bypassPro =
    discordId != null &&
    !user?.lifetimePremiumAt &&
    (await isPremiumBypassDiscordIdResolved(discordId));
  const isOwner =
    discordId != null && (await isBotOwnerDiscordIdResolved(discordId));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
      <nav aria-label="Breadcrumb">
        <Link
          href="/dashboard"
          className="text-xs font-medium uppercase tracking-wider text-muted hover:text-edge motion-safe:transition"
        >
          ← All servers
        </Link>
      </nav>

      <header className="reveal flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={icon}
            alt=""
            className="h-20 w-20 shrink-0 rounded-2xl border border-white/[0.08] shadow-card ring-1 ring-inset ring-white/[0.05] sm:h-24 sm:w-24"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-dashed border-surface-border font-display text-3xl font-semibold text-muted sm:h-24 sm:w-24 sm:text-4xl">
            {guildNameInitial(guild.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-accent-strong sm:text-3xl">
            {guild.name}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
            Dashboard for this server. Knife Pro is tied to your Discord
            account — billing and receipts are on the main dashboard.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-surface/60 px-3 py-1 text-xs font-medium text-edge/90">
              Knife connected
            </span>
            {isOwner ? (
              <span className="inline-flex items-center rounded-full border border-edge/40 bg-edge-muted/35 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-edge">
                Owner
              </span>
            ) : null}
            {premiumActive ? (
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-foreground">
                {user?.lifetimePremiumAt
                  ? "Lifetime Pro"
                  : bypassPro
                    ? "Knife Pro"
                    : "Pro active"}
              </span>
            ) : (
              <ButtonLink href="/pricing" variant="secondary" className="text-xs">
                Get Pro — $10
              </ButtonLink>
            )}
          </div>
        </div>
      </header>

      <div className="reveal reveal-delay-1 grid gap-4 sm:grid-cols-2">
        <Card padding="md" elevated className="sm:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Overview
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Server-specific settings and analytics can plug in here (prefix,
            modules, logs). The bot and this site share your database when you
            wire them together.
          </p>
        </Card>
        <Card padding="md">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Quick links
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href="/docs/getting-started"
                className="text-edge underline decoration-edge/35 underline-offset-2 hover:decoration-edge"
              >
                Getting started
              </Link>
            </li>
            <li>
              <Link
                href="/docs/permissions"
                className="text-edge underline decoration-edge/35 underline-offset-2 hover:decoration-edge"
              >
                Permissions
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard"
                className="text-edge underline decoration-edge/35 underline-offset-2 hover:decoration-edge"
              >
                Account & billing
              </Link>
            </li>
          </ul>
        </Card>
        <Card padding="md">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Server ID
          </h2>
          <p className="mt-3 break-all font-mono text-[11px] text-muted">
            {guild.id}
          </p>
        </Card>
      </div>
    </main>
  );
}
