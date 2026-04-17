"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { ArivixParsedEmbed } from "@/lib/embed-script";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

function hexToRgb(hex: string): string | null {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = Number.parseInt(h, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function PreviewImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(false);
  }, [src]);
  if (hidden || !src.trim()) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHidden(true)}
    />
  );
}

function DiscordEmbedInner({ embed }: { embed: ArivixParsedEmbed }) {
  const bar =
    embed.color != null
      ? `#${embed.color.toString(16).padStart(6, "0")}`
      : "#f04747";
  const rgb = hexToRgb(bar) ?? "rgb(240, 71, 71)";

  const hasBody =
    Boolean(embed.author?.name) ||
    Boolean(embed.title) ||
    Boolean(embed.description) ||
    Boolean(embed.fields?.length) ||
    Boolean(embed.thumbnail?.url) ||
    Boolean(embed.image?.url) ||
    Boolean(embed.footer?.text) ||
    Boolean(embed.timestamp);

  if (!hasBody) return null;

  return (
    <div className="flex min-w-0 gap-2 rounded-[4px] bg-[#2b2d31] text-left">
      <div
        className="w-1 shrink-0 rounded-l-[3px]"
        style={{ backgroundColor: rgb }}
        aria-hidden
      />
      <div className="min-w-0 flex-1 py-2.5 pl-3 pr-4 pb-3">
        <div className="flex gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            {embed.author?.name ? (
              <div className="flex items-center gap-2">
                {embed.author.icon_url ? (
                  <PreviewImg
                    src={embed.author.icon_url}
                    alt=""
                    className="size-6 shrink-0 rounded-full"
                  />
                ) : null}
                <span className="text-sm font-semibold text-[#f2f3f5]">
                  {embed.author.name}
                </span>
              </div>
            ) : null}
            {embed.title ? (
              <div className="text-sm font-semibold text-[#f2f3f5]">
                {embed.url ? (
                  <a
                    href={embed.url}
                    className="text-[#00a8fc] hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {embed.title}
                  </a>
                ) : (
                  embed.title
                )}
              </div>
            ) : null}
            {embed.description ? (
              <div className="whitespace-pre-wrap text-sm font-medium leading-snug text-[#eceff3]">
                {embed.description}
              </div>
            ) : null}
            {embed.fields?.length ? (
              <div
                className={cn(
                  "grid gap-3 pt-0.5",
                  embed.fields.some((f) => f.inline)
                    ? "sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1",
                )}
              >
                {embed.fields.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className={cn("min-w-0", f.inline && "sm:min-w-[6rem]")}
                  >
                    <div className="text-xs font-semibold text-[#f2f3f5]">
                      {f.name}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm font-medium leading-snug text-[#eceff3]">
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {embed.image?.url ? (
              <PreviewImg
                src={embed.image.url}
                alt=""
                className="mt-1 max-h-48 w-full rounded-md object-cover"
              />
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
              {embed.footer?.text ? (
                <div className="flex min-w-0 items-center gap-2 text-xs text-[#949ba4]">
                  {embed.footer.icon_url ? (
                    <PreviewImg
                      src={embed.footer.icon_url}
                      alt=""
                      className="size-4 shrink-0 rounded-full"
                    />
                  ) : null}
                  <span className="truncate">{embed.footer.text}</span>
                </div>
              ) : null}
              {embed.timestamp ? (
                <div className="text-xs text-[#949ba4]">
                  {new Date(embed.timestamp).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>
              ) : null}
            </div>
          </div>
          {embed.thumbnail?.url ? (
            <PreviewImg
              src={embed.thumbnail.url}
              alt=""
              className="mt-1 max-h-20 w-20 shrink-0 rounded-md object-cover"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

type EmbedBuilderLivePreviewProps = {
  messageContent: string;
  embed: ArivixParsedEmbed;
  className?: string;
};

export function EmbedBuilderLivePreview({
  messageContent,
  embed,
  className,
}: EmbedBuilderLivePreviewProps) {
  const reduce = useReducedMotion();
  const hasMsg = messageContent.trim().length > 0;
  const hasEmb =
    Boolean(embed.author?.name) ||
    Boolean(embed.title) ||
    Boolean(embed.description) ||
    Boolean(embed.fields?.length) ||
    Boolean(embed.thumbnail?.url) ||
    Boolean(embed.image?.url) ||
    Boolean(embed.footer?.text) ||
    Boolean(embed.timestamp);

  const transition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34 };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/[0.1] bg-[#313338] shadow-[0_24px_48px_-20px_rgba(0,0,0,0.75)]",
        className,
      )}
      role="region"
      aria-label="Discord-style embed preview"
    >
      <div className="border-b border-black/20 bg-[#2b2d31]/90 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full bg-[#3ba55d]"
            aria-hidden
            title="Online"
          />
          <Icon
            icon="mdi:pound"
            className="size-3.5 text-[#949ba4]"
            aria-hidden
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#949ba4]">
            embed-preview
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <motion.div
          layout={!reduce}
          transition={transition}
          className="flex gap-3"
        >
          <div
            className="relative mt-0.5 size-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-blue-950 ring-2 ring-black/30"
            aria-hidden
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white/95">
              K
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="inline-flex items-center gap-1 text-base font-semibold text-[#f2f3f5]">
                <Icon
                  icon="mdi:robot-happy-outline"
                  className="size-4 opacity-80"
                  aria-hidden
                />
                Arivix
              </span>
              <span className="inline-flex items-center gap-0.5 rounded bg-[#5865f2] px-1 py-px text-[10px] font-bold uppercase leading-none text-white">
                <Icon
                  icon="mdi:shield-check"
                  className="size-2.5 opacity-95"
                  aria-hidden
                />
                Bot
              </span>
              <time
                className="inline-flex items-center gap-1 text-xs text-[#949ba4]"
                dateTime={new Date().toISOString()}
              >
                <Icon icon="mdi:clock-outline" className="size-3" aria-hidden />
                Today at{" "}
                {new Date().toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
              {hasMsg ? (
                <motion.div
                  key="msg"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -4 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.22 }}
                  className="mt-1.5 whitespace-pre-wrap text-sm font-medium leading-relaxed text-[#eceff3]"
                >
                  {messageContent}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {hasEmb ? (
                <motion.div
                  key="embed"
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 380, damping: 28 }
                  }
                  className="mt-2 max-w-full"
                >
                  <DiscordEmbedInner embed={embed} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  className="mt-3 rounded-lg border border-dashed border-white/[0.12] bg-black/25 px-4 py-8 text-center"
                >
                  <Icon
                    icon="mdi:view-dashboard-variant-outline"
                    className="mx-auto size-12 text-[#949ba4]/50"
                    aria-hidden
                  />
                  <p className="mt-2 text-sm font-medium text-[#b5bac1]">
                    Embed appears here
                  </p>
                  <p className="mt-1 text-xs text-[#949ba4]">
                    Add a title, description, image, or fields — updates live.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
