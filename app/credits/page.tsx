import type { Metadata } from "next";
import { Icon } from "@/components/ui/icon";
import Image from "next/image";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Credits",
  description: "The team and contributors behind Knife.",
  robots: { index: true, follow: true },
};

type CreditMember = {
  name: string;
  role: string;
  roleIcon: string;
  avatar: string;
  accent: string;
  bio: string;
  badges: string[];
};

const CREDIT_MEMBERS: CreditMember[] = [
  {
    name: "Seventy",
    role: "Founder & CEO",
    roleIcon: "mdi:crown-outline",
    avatar: "/team/seventy.png",
    accent: "#ef4444",
    bio: "Product direction, bot architecture, and ecosystem decisions.",
    badges: ["mdi:code-braces", "mdi:server-network", "mdi:shield-crown-outline"],
  },
  {
    name: "Contributor One",
    role: "Manager",
    roleIcon: "mdi:shield-account-outline",
    avatar: "/showcase/ak.png",
    accent: "#a855f7",
    bio: "Operations, moderation standards, and release coordination.",
    badges: ["mdi:account-check-outline", "mdi:timeline-clock-outline"],
  },
  {
    name: "Contributor Two",
    role: "Contributor",
    roleIcon: "mdi:star-outline",
    avatar: "/showcase/ak.png",
    accent: "#22c55e",
    bio: "Feature feedback, docs notes, and testing support.",
    badges: ["mdi:test-tube", "mdi:note-text-outline"],
  },
];

export default function CreditsPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 sm:gap-12 sm:px-6 sm:py-14 lg:px-8">
      <header className="border-b border-red-950/30 pb-7 sm:pb-8">
        <span
          className="mb-3 block h-1 w-10 rounded-full bg-gradient-to-r from-edge/70 via-edge/30 to-transparent"
          aria-hidden
        />
        <h1 className="font-display text-3xl font-bold tracking-tight text-accent-strong sm:text-4xl">
          Credits
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          The people behind Knife. You can send updated names, roles, avatars,
          and badge icons later and this page is ready to swap them in.
        </p>
      </header>

      <section>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CREDIT_MEMBERS.map((m) => (
            <li key={m.name}>
              <article
                className={cn(
                  "relative h-full overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-[#141010] via-[#100c0c] to-[#0a0808] px-6 pb-6 pt-7",
                  "shadow-[0_24px_56px_-28px_rgba(0,0,0,0.85)]",
                )}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-25"
                  style={{
                    background: `radial-gradient(circle at 30% 0%, ${m.accent}, transparent 72%)`,
                  }}
                  aria-hidden
                />
                <div className="relative z-[1] flex flex-col items-center text-center">
                  <div className="size-[5.5rem] overflow-hidden rounded-full ring-2 ring-white/[0.08] ring-offset-4 ring-offset-[#0a0808]">
                    <Image
                      src={m.avatar}
                      alt={`${m.name} avatar`}
                      width={176}
                      height={176}
                      className="size-full object-cover"
                    />
                  </div>

                  <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-accent-strong">
                    {m.name}
                  </h2>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {m.badges.map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] p-2"
                        title={badge}
                      >
                        <Icon icon={badge} className="size-4 text-edge/90" aria-hidden />
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
                    <Icon icon={m.roleIcon} className="size-4 text-edge/85" aria-hidden />
                    {m.role}
                  </p>
                  <p className="mt-5 text-sm leading-relaxed text-muted">{m.bio}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-surface/40 p-5 text-sm leading-relaxed text-muted sm:p-6">
        <p>
          Want edits here later? Send names, role titles, avatars, and icon ids
          (for example <code className="font-mono text-edge">mdi:shield-star-outline</code>)
          and the cards can be updated directly.
        </p>
      </section>
    </main>
  );
}
