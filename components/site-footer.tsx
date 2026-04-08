import type { SiteMessages } from "@/lib/i18n/messages";
import Link from "next/link";

type Props = {
  footer: SiteMessages["footer"];
};

export function SiteFooter({ footer }: Props) {
  const product = [
    { href: "/", label: footer.home },
    { href: "/docs", label: footer.docs },
    { href: "/commands", label: footer.commands },
    { href: "/pricing", label: footer.pricing },
    { href: "/dashboard", label: footer.dashboard },
  ] as const;

  const legal = [
    { href: "/terms", label: footer.terms },
    { href: "/privacy", label: footer.privacy },
  ] as const;

  const connect: readonly { href: string; label: string; external?: boolean }[] =
    [
      { href: "/status", label: footer.status },
      { href: "mailto:support@knife.rip", label: footer.support, external: true },
    ];

  return (
    <footer className="relative z-[1] mt-auto border-t border-red-950/45 bg-[#0a0505]/75 backdrop-blur-sm">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2 lg:col-span-1">
          <p className="font-display text-sm font-bold text-accent-strong">
            Knife
          </p>
          <p className="mt-2 text-sm text-muted">knife.rip</p>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted">
            {footer.tagline}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {footer.product}
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {product.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-muted motion-safe:transition hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {footer.legal}
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {legal.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-muted motion-safe:transition hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {footer.connect}
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {connect.map((l) =>
              l.external === true ? (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-muted motion-safe:transition hover:text-foreground"
                  >
                    {l.label}
                  </a>
                </li>
              ) : (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-muted motion-safe:transition hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-red-950/35 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} Knife
      </div>
    </footer>
  );
}
