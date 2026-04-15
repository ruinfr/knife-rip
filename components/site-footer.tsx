import { Icon } from "@/components/ui/icon";
import type { SiteMessages } from "@/lib/i18n/messages";
import Link from "next/link";

type Props = {
  footer: SiteMessages["footer"];
};

export function SiteFooter({ footer }: Props) {
  const product = [
    { href: "/", label: footer.home, icon: "mdi:home-outline" },
    { href: "/docs", label: footer.docs, icon: "mdi:book-open-variant" },
    { href: "/changelog", label: footer.news, icon: "mdi:newspaper-variant-outline" },
    { href: "/commands", label: footer.commands, icon: "mdi:console" },
    { href: "/pricing", label: footer.pricing, icon: "mdi:tag-outline" },
    {
      href: "/dashboard",
      label: footer.dashboard,
      icon: "mdi:view-dashboard-outline",
    },
  ] as const;

  const legal = [
    { href: "/terms", label: footer.terms, icon: "mdi:file-document-outline" },
    { href: "/privacy", label: footer.privacy, icon: "mdi:shield-lock-outline" },
  ] as const;

  const connect: readonly {
    href: string;
    label: string;
    icon: string;
    external?: boolean;
  }[] = [
    { href: "/status", label: footer.status, icon: "mdi:heart-pulse" },
    {
      href: "mailto:support@arivix.org",
      label: footer.support,
      icon: "mdi:email-outline",
      external: true,
    },
  ];

  return (
    <footer className="relative z-[1] mt-auto border-t border-blue-950/45 bg-[#0a0e14]/75 backdrop-blur-sm">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:px-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2 lg:col-span-1">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-accent-strong">
            <Icon
              icon="mdi:shield"
              className="size-5 shrink-0 text-edge"
              aria-hidden
            />
            Arivix
          </p>
          <p className="mt-2 text-sm text-muted">arivix.org</p>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted">
            {footer.tagline}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <Icon
              icon="mdi:package-variant"
              className="size-3.5 shrink-0 text-edge/85"
              aria-hidden
            />
            {footer.product}
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {product.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex items-center gap-2 text-muted motion-safe:transition hover:text-foreground"
                >
                  <Icon
                    icon={l.icon}
                    className="size-4 shrink-0 opacity-75"
                    aria-hidden
                  />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <Icon
              icon="mdi:gavel"
              className="size-3.5 shrink-0 text-edge/85"
              aria-hidden
            />
            {footer.legal}
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {legal.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex items-center gap-2 text-muted motion-safe:transition hover:text-foreground"
                >
                  <Icon
                    icon={l.icon}
                    className="size-4 shrink-0 opacity-75"
                    aria-hidden
                  />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <Icon
              icon="mdi:link-variant"
              className="size-3.5 shrink-0 text-edge/85"
              aria-hidden
            />
            {footer.connect}
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {connect.map((l) =>
              l.external === true ? (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="inline-flex items-center gap-2 text-muted motion-safe:transition hover:text-foreground"
                  >
                    <Icon
                      icon={l.icon}
                      className="size-4 shrink-0 opacity-75"
                      aria-hidden
                    />
                    {l.label}
                  </a>
                </li>
              ) : (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex items-center gap-2 text-muted motion-safe:transition hover:text-foreground"
                  >
                    <Icon
                      icon={l.icon}
                      className="size-4 shrink-0 opacity-75"
                      aria-hidden
                    />
                    {l.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-blue-950/35 py-4 text-xs text-muted">
        <Icon icon="mdi:copyright" className="size-3.5 opacity-80" aria-hidden />
        <span>
          {new Date().getFullYear()} Arivix
        </span>
      </div>
    </footer>
  );
}
