"use client";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { KnifeParsedEmbed } from "@/lib/embed-script";
import { serializeKnifeEmbedScript } from "@/lib/embed-script";
import {
  EMBED_VARIABLE_CATEGORIES,
  type EmbedVariableCategoryId,
} from "@/lib/embed-builder-variables";
import { cn } from "@/lib/cn";
import { useMemo, useState } from "react";

const TABS = [
  "general",
  "author",
  "fields",
  "footer",
  "preview",
  "script",
] as const;

type TabId = (typeof TABS)[number];

type FieldRow = { id: string; name: string; value: string; inline: boolean };

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function hexToRgb(hex: string): string | null {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = Number.parseInt(h, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function toPreviewApiEmbed(state: {
  messageContent: string;
  title: string;
  description: string;
  url: string;
  color: string;
  thumbnail: string;
  image: string;
  timestamp: boolean;
  authorName: string;
  authorUrl: string;
  authorIconUrl: string;
  footerText: string;
  footerIconUrl: string;
  fields: FieldRow[];
}): KnifeParsedEmbed {
  const e: KnifeParsedEmbed = {};
  if (state.title.trim()) e.title = state.title.trim();
  if (state.description.trim()) e.description = state.description.trim();
  if (state.url.trim()) e.url = state.url.trim();
  const c = state.color.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(c)) e.color = Number.parseInt(c, 16);
  if (state.thumbnail.trim()) e.thumbnail = { url: state.thumbnail.trim() };
  if (state.image.trim()) e.image = { url: state.image.trim() };
  if (state.timestamp) e.timestamp = new Date().toISOString();
  if (state.authorName.trim()) {
    e.author = {
      name: state.authorName.trim(),
      url: state.authorUrl.trim() || undefined,
      icon_url: state.authorIconUrl.trim() || undefined,
    };
  }
  if (state.footerText.trim()) {
    e.footer = {
      text: state.footerText.trim(),
      icon_url: state.footerIconUrl.trim() || undefined,
    };
  }
  const fields = state.fields
    .filter((f) => f.name.trim() || f.value.trim())
    .slice(0, 25)
    .map((f) => ({
      name: f.name.trim().slice(0, 256),
      value: f.value.trim().slice(0, 1024),
      inline: f.inline,
    }));
  if (fields.length) e.fields = fields;
  return e;
}

function DiscordishPreview({ embed }: { embed: KnifeParsedEmbed }) {
  const bar =
    embed.color != null
      ? `#${embed.color.toString(16).padStart(6, "0")}`
      : "#f87171";
  const rgb = hexToRgb(bar) ?? "rgb(248, 113, 113)";

  return (
    <div
      className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#313338] text-left shadow-lg"
      style={{ fontFamily: "var(--font-geist-mono), ui-sans-serif, system-ui" }}
    >
      <div className="flex gap-3 p-3 pr-4">
        <div
          className="w-1 shrink-0 rounded-full"
          style={{ backgroundColor: rgb }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2 text-sm text-[#f2f3f5]">
          {embed.author?.name ? (
            <div className="flex items-center gap-2">
              {embed.author.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={embed.author.icon_url}
                  alt=""
                  className="size-5 rounded-full"
                />
              ) : null}
              <span className="font-semibold">{embed.author.name}</span>
            </div>
          ) : null}
          {embed.title ? (
            <div className="font-semibold">
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
            <div className="whitespace-pre-wrap text-[#dbdee1]">
              {embed.description}
            </div>
          ) : null}
          {embed.fields?.length ? (
            <div
              className={cn(
                "grid gap-2 pt-1",
                embed.fields.some((f) => f.inline)
                  ? "sm:grid-cols-2 md:grid-cols-3"
                  : "grid-cols-1",
              )}
            >
              {embed.fields.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className={cn("min-w-0", f.inline && "sm:min-w-[8rem]")}
                >
                  <div className="text-xs font-semibold text-[#f2f3f5]">
                    {f.name}
                  </div>
                  <div className="mt-0.5 whitespace-pre-wrap text-[#dbdee1]">
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {embed.thumbnail?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={embed.thumbnail.url}
              alt=""
              className="float-right ml-2 max-h-20 max-w-[5rem] rounded object-contain"
            />
          ) : null}
          {embed.image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={embed.image.url}
              alt=""
              className="mt-1 max-h-48 w-full rounded object-cover"
            />
          ) : null}
          {embed.footer?.text ? (
            <div className="flex items-center gap-2 text-xs text-[#949ba4]">
              {embed.footer.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={embed.footer.icon_url}
                  alt=""
                  className="size-4 rounded-full"
                />
              ) : null}
              <span>{embed.footer.text}</span>
            </div>
          ) : null}
          {embed.timestamp ? (
            <div className="text-xs text-[#949ba4]">
              {new Date(embed.timestamp).toLocaleString()}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function KnifeEmbedBuilder() {
  const [tab, setTab] = useState<TabId>("general");
  const [messageContent, setMessageContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#f87171");
  const [thumbnail, setThumbnail] = useState("");
  const [image, setImage] = useState("");
  const [timestamp, setTimestamp] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorUrl, setAuthorUrl] = useState("");
  const [authorIconUrl, setAuthorIconUrl] = useState("");
  const [footerText, setFooterText] = useState("");
  const [footerIconUrl, setFooterIconUrl] = useState("");
  const [fields, setFields] = useState<FieldRow[]>([]);

  const [varCat, setVarCat] = useState<EmbedVariableCategoryId>("user");
  const [copied, setCopied] = useState<string | null>(null);

  const generated = useMemo(
    () =>
      serializeKnifeEmbedScript(messageContent, {
        title,
        description,
        url,
        color,
        thumbnail,
        image,
        timestamp,
        authorName,
        authorUrl,
        authorIconUrl,
        footerText,
        footerIconUrl,
        fields: fields.map((f) => ({
          name: f.name,
          value: f.value,
          inline: f.inline,
        })),
      }),
    [
      messageContent,
      title,
      description,
      url,
      color,
      thumbnail,
      image,
      timestamp,
      authorName,
      authorUrl,
      authorIconUrl,
      footerText,
      footerIconUrl,
      fields,
    ],
  );

  const previewEmbed = useMemo(
    () =>
      toPreviewApiEmbed({
        messageContent,
        title,
        description,
        url,
        color,
        thumbnail,
        image,
        timestamp,
        authorName,
        authorUrl,
        authorIconUrl,
        footerText,
        footerIconUrl,
        fields,
      }),
    [
      messageContent,
      title,
      description,
      url,
      color,
      thumbnail,
      image,
      timestamp,
      authorName,
      authorUrl,
      authorIconUrl,
      footerText,
      footerIconUrl,
      fields,
    ],
  );

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("error");
    }
  };

  const addField = () => {
    if (fields.length >= 25) return;
    setFields((f) => [...f, { id: randomId(), name: "", value: "", inline: false }]);
  };

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:gap-8">
      <div className="min-w-0 flex-1 space-y-6">
        <Card
          padding="lg"
          className="border-white/[0.08] bg-surface/50 shadow-[0_0_48px_-20px_rgba(220,38,38,0.2)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-accent-strong">
                Embed builder
              </h2>
              <p className="mt-1 text-sm text-muted">
                Knife script format — use with{" "}
                <code className="rounded bg-background/80 px-1 font-mono text-xs text-edge">
                  .say
                </code>{" "}
                or{" "}
                <code className="rounded bg-background/80 px-1 font-mono text-xs text-edge">
                  .createembed
                </code>{" "}
                in Discord.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyText("script", generated)}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-background/60 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-edge/30 hover:bg-surface-elevated"
              >
                <Icon icon="mdi:content-copy" className="size-4" aria-hidden />
                Copy script
              </button>
              {copied === "script" ? (
                <span className="self-center text-xs text-success">Copied</span>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1 flex justify-between gap-2">
              <label className={labelClass} htmlFor="msg-content">
                Message content
              </label>
              <span className="text-[10px] text-muted">
                {messageContent.length}/2000
              </span>
            </div>
            <textarea
              id="msg-content"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value.slice(0, 2000))}
              placeholder="Optional text above the embed"
              rows={3}
              className="w-full resize-y rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none ring-edge/20 placeholder:text-muted/70 focus:border-edge/35 focus:ring-2"
            />
          </div>

          <div className="mt-6 border-b border-white/[0.06] pb-1">
            <div className="-mx-1 flex flex-wrap gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "motion-safe:transition shrink-0 rounded-full px-3 py-2 text-xs font-semibold capitalize",
                    tab === t
                      ? "bg-red-950/55 text-foreground ring-1 ring-edge/35"
                      : "text-muted hover:bg-white/[0.04] hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {tab === "general" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <div className="mb-1 flex justify-between">
                      <label className={labelClass} htmlFor="emb-title">
                        Title
                      </label>
                      <span className="text-[10px] text-muted">
                        {title.length}/256
                      </span>
                    </div>
                    <input
                      id="emb-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 256))}
                      placeholder="Embed title"
                      className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="emb-url">
                      URL
                    </label>
                    <input
                      id="emb-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://…"
                      className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-1 flex justify-between">
                      <label className={labelClass} htmlFor="emb-desc">
                        Description
                      </label>
                      <span className="text-[10px] text-muted">
                        {description.length}/4096
                      </span>
                    </div>
                    <textarea
                      id="emb-desc"
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value.slice(0, 4096))
                      }
                      placeholder="Embed description — use variables from the panel →"
                      rows={5}
                      className="w-full resize-y rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="emb-color">
                      Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="emb-color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 font-mono text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                      />
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#f87171"}
                        onChange={(e) => setColor(e.target.value)}
                        className="size-10 cursor-pointer rounded-lg border border-white/[0.1] bg-transparent"
                        title="Pick color"
                        aria-label="Pick embed color"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="emb-thumb">
                      Thumbnail URL
                    </label>
                    <input
                      id="emb-thumb"
                      value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      placeholder="https://…"
                      className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="emb-image">
                      Image URL
                    </label>
                    <input
                      id="emb-image"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="https://…"
                      className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                    />
                  </div>
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={timestamp}
                      onClick={() => setTimestamp((v) => !v)}
                      className={cn(
                        "relative h-7 w-12 rounded-full transition",
                        timestamp ? "bg-edge/50" : "bg-white/[0.08]",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 size-6 rounded-full bg-foreground transition",
                          timestamp ? "left-6" : "left-0.5",
                        )}
                      />
                    </button>
                    <span className="text-sm text-muted">
                      Include timestamp
                    </span>
                  </div>
                </div>
              </>
            ) : null}

            {tab === "author" ? (
              <div className="grid gap-4">
                <div>
                  <label className={labelClass} htmlFor="auth-name">
                    Author name
                  </label>
                  <input
                    id="auth-name"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value.slice(0, 256))}
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="auth-url">
                    Author URL
                  </label>
                  <input
                    id="auth-url"
                    value={authorUrl}
                    onChange={(e) => setAuthorUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="auth-icon">
                    Author icon URL
                  </label>
                  <input
                    id="auth-icon"
                    value={authorIconUrl}
                    onChange={(e) => setAuthorIconUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}

            {tab === "fields" ? (
              <div className="space-y-3">
                {fields.map((f, idx) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-white/[0.06] bg-background/40 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted">
                        Field {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFields((rows) => rows.filter((r) => r.id !== f.id))
                        }
                        className="text-xs text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      value={f.name}
                      onChange={(e) =>
                        setFields((rows) =>
                          rows.map((r) =>
                            r.id === f.id
                              ? { ...r, name: e.target.value.slice(0, 256) }
                              : r,
                          ),
                        )
                      }
                      placeholder="Field name"
                      className="mb-2 w-full rounded-lg border border-white/[0.08] bg-background/80 px-2 py-1.5 text-sm outline-none focus:border-edge/35"
                    />
                    <textarea
                      value={f.value}
                      onChange={(e) =>
                        setFields((rows) =>
                          rows.map((r) =>
                            r.id === f.id
                              ? { ...r, value: e.target.value.slice(0, 1024) }
                              : r,
                          ),
                        )
                      }
                      placeholder="Field value"
                      rows={2}
                      className="mb-2 w-full resize-y rounded-lg border border-white/[0.08] bg-background/80 px-2 py-1.5 text-sm outline-none focus:border-edge/35"
                    />
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={f.inline}
                        onChange={(e) =>
                          setFields((rows) =>
                            rows.map((r) =>
                              r.id === f.id
                                ? { ...r, inline: e.target.checked }
                                : r,
                            ),
                          )
                        }
                      />
                      Inline
                    </label>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addField}
                  disabled={fields.length >= 25}
                  className="rounded-full border border-dashed border-white/[0.15] px-4 py-2 text-xs font-semibold text-muted transition hover:border-edge/30 hover:text-foreground disabled:opacity-40"
                >
                  + Add field
                </button>
              </div>
            ) : null}

            {tab === "footer" ? (
              <div className="grid gap-4">
                <div>
                  <label className={labelClass} htmlFor="foot-text">
                    Footer text
                  </label>
                  <input
                    id="foot-text"
                    value={footerText}
                    onChange={(e) =>
                      setFooterText(e.target.value.slice(0, 2048))
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="foot-icon">
                    Footer icon URL
                  </label>
                  <input
                    id="foot-icon"
                    value={footerIconUrl}
                    onChange={(e) => setFooterIconUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 focus:border-edge/35 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}

            {tab === "preview" ? (
              <div>
                <p className="mb-3 text-sm text-muted">
                  Approximate Discord appearance (fonts may differ slightly).
                </p>
                {previewEmbed.title ||
                previewEmbed.description ||
                previewEmbed.image ||
                previewEmbed.thumbnail ||
                previewEmbed.fields?.length ||
                previewEmbed.author ||
                previewEmbed.footer ? (
                  <DiscordishPreview embed={previewEmbed} />
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.1] bg-background/50 py-16 text-center text-sm text-muted">
                    Add a title, description, or image to preview your embed.
                  </div>
                )}
              </div>
            ) : null}

            {tab === "script" ? (
              <div>
                <p className="mb-2 text-sm text-muted">
                  Paste this into Discord after{" "}
                  <code className="font-mono text-xs text-edge">#channel</code>.
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/[0.08] bg-background/90 p-4 font-mono text-xs leading-relaxed text-accent">
                  {generated || "{embed}$v{title: …}"}
                </pre>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <aside className="w-full shrink-0 lg:w-[340px]">
        <Card
          padding="lg"
          className="sticky top-20 border-white/[0.08] bg-surface/45"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Icon icon="mdi:code-braces" className="size-5 text-edge" aria-hidden />
            <h3 className="font-display text-sm font-bold text-accent-strong">
              Variables
            </h3>
          </div>
          <p className="mt-2 text-xs text-muted">
            Click to copy. Paste into message or description when placeholders
            run on the bot (see category notes).
          </p>

          <div className="mt-3 flex flex-wrap gap-1">
            {EMBED_VARIABLE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setVarCat(c.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold transition",
                  varCat === c.id
                    ? "bg-red-950/55 text-foreground ring-1 ring-edge/35"
                    : "border border-white/[0.08] text-muted hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <ul className="mt-4 max-h-[min(52vh,28rem)] space-y-2 overflow-y-auto pr-1">
            {EMBED_VARIABLE_CATEGORIES.find((c) => c.id === varCat)?.items.map(
              (item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => void copyText(item.key, item.key)}
                    className="w-full rounded-xl border border-white/[0.06] bg-background/60 px-3 py-2.5 text-left transition hover:border-edge/25 hover:bg-surface-elevated"
                  >
                    <code className="text-xs font-semibold text-edge">
                      {item.key}
                    </code>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {item.description}
                    </div>
                  </button>
                </li>
              ),
            )}
          </ul>
          {copied && copied !== "script" && copied !== "error" ? (
            <p className="mt-2 text-xs text-success">Copied {copied}</p>
          ) : null}
        </Card>
      </aside>
    </div>
  );
}
