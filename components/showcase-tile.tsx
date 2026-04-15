import { guildNameInitial } from "@/lib/guild-name-initial";
import Image from "next/image";
import Link from "next/link";

export type ShowcaseTileItem = {
  key: string;
  name: string;
  detail: string;
  href: string;
  image?: string;
  showPlus?: boolean;
};

type Props = {
  s: ShowcaseTileItem;
  interactive?: boolean;
};

const tileClassName =
  "group flex flex-col items-center rounded-xl px-1 pb-2 pt-1 text-center motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function ShowcaseTile({ s, interactive = true }: Props) {
  const external = s.href.startsWith("http");

  const avatar = (
    <div
      className="motion-safe:transition relative h-[3.35rem] w-[3.35rem] shrink-0 overflow-hidden rounded-full border border-white/[0.08] bg-gradient-to-br from-blue-950/40 to-surface/80 shadow-[0_0_28px_-10px_rgba(37,99,235,0.28)] ring-1 ring-inset ring-white/[0.05] group-hover:-translate-y-0.5 group-hover:border-white/[0.12] group-hover:shadow-[0_0_40px_-10px_rgba(37,99,235,0.38)]"
      aria-hidden
    >
      {s.image ? (
        <Image
          src={s.image}
          alt=""
          fill
          sizes="54px"
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-display text-2xl font-semibold leading-none text-edge">
          {s.showPlus ? "+" : guildNameInitial(s.name)}
        </span>
      )}
    </div>
  );

  const body = (
    <>
      {avatar}
      <p className="mt-3 text-xs font-semibold tracking-tight text-foreground group-hover:text-edge">
        {s.name}
      </p>
      <p className="mt-0.5 text-[11px] font-normal text-muted">{s.detail}</p>
      {!external ? (
        <p className="mt-1.5 text-[10px] font-medium tracking-tight text-muted group-hover:text-edge/80">
          Next up — yours
        </p>
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <div className={tileClassName} aria-label={s.name}>
        {body}
      </div>
    );
  }

  if (external) {
    return (
      <a
        href={s.href}
        target="_blank"
        rel="noopener noreferrer"
        className={tileClassName}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={s.href} className={tileClassName}>
      {body}
    </Link>
  );
}
