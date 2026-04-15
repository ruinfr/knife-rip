"use client";

import { EmbedBuilderLivePreview } from "@/components/embed-builder/discord-embed-preview";
import { Card } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  EMBED_VARIABLE_CATEGORIES,
  type EmbedVariableCategoryId,
} from "@/lib/embed-builder-variables";
import { serializeKnifeEmbedScript, type KnifeParsedEmbed } from "@/lib/embed-script";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

const TABS = ["general", "author", "fields", "footer", "script"] as const;
type TabId = (typeof TABS)[number];

const TAB_LABEL: Record<TabId, string> = {
  general: "General",
  author: "Author",
  fields: "Fields",
  footer: "Footer",
  script: "Script",
};

const TAB_ICON: Record<TabId, string> = {
  general: "mdi:tune-variant",
  author: "mdi:account-circle-outline",
  fields: "mdi:table-large",
  footer: "mdi:format-vertical-align-bottom",
  script: "mdi:code-tags",
};

const COLOR_PRESETS = [
  { hex: "#ef4444", label: "Red" },
  { hex: "#5865f2", label: "Blurple" },
  { hex: "#57f287", label: "Green" },
  { hex: "#fee75c", label: "Yellow" },
  { hex: "#eb459e", label: "Pink" },
  { hex: "#ed4245", label: "Red 2" },
  { hex: "#99aab5", label: "Gray" },
  { hex: "#ffffff", label: "White" },
] as const;

type FieldRow = { id: string; name: string; value: string; inline: boolean };

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

export function KnifeEmbedBuilder() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<TabId>("general");
  const [messageContent, setMessageContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#ef4444");
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

  const formState = useMemo(
    () => ({
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

  const previewEmbed = useMemo(() => toPreviewApiEmbed(formState), [formState]);

  const displayEmbed = previewEmbed;

  const displayMessage = useMemo(() => {
    const raw = messageContent.trim();
    return raw;
  }, [messageContent]);

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
    setFields((f) => [
      ...f,
      { id: randomId(), name: "", value: "", inline: false },
    ]);
  };

  const clearAll = () => {
    setMessageContent("");
    setTitle("");
    setDescription("");
    setUrl("");
    setColor("#ef4444");
    setThumbnail("");
    setImage("");
    setTimestamp(false);
    setAuthorName("");
    setAuthorUrl("");
    setAuthorIconUrl("");
    setFooterText("");
    setFooterIconUrl("");
    setFields([]);
  };

  const labelClass =
    "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted";

  const fieldMotion = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { type: "spring" as const, stiffness: 380, damping: 30 },
      };

  const actionBtn =
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full px-3.5 text-xs font-semibold motion-safe:transition sm:px-4";

  return (
    <div className="grid gap-10 xl:grid-cols-12 xl:items-start xl:gap-x-10 xl:gap-y-8 2xl:gap-x-12">
      <div className="min-w-0 xl:col-span-7 2xl:col-span-8">
        <Card
          padding="lg"
          className="border-white/[0.08] bg-surface/50 shadow-[0_0_48px_-20px_rgba(37,99,235,0.2)] motion-safe:transition-shadow motion-safe:hover:shadow-[0_0_56px_-18px_rgba(37,99,235,0.25)]"
        >
          <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-accent-strong">
                  <Icon
                    icon="mdi:card-bulleted-outline"
                    className="size-7 shrink-0 text-edge"
                    aria-hidden
                  />
                  Compose
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:max-w-[min(100%,22rem)] sm:justify-end">
                <motion.button
                  type="button"
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  onClick={clearAll}
                  className={cn(
                    actionBtn,
                    "border border-white/[0.08] text-muted hover:border-white/[0.14] hover:text-foreground",
                  )}
                >
                  <Icon icon="mdi:broom" className="size-4" aria-hidden />
                  Clear
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  onClick={() => void copyText("script", generated)}
                  className={cn(
                    actionBtn,
                    "border border-blue-500/30 bg-blue-950/35 text-foreground shadow-[0_0_24px_-12px_rgba(37,99,235,0.5)] hover:border-blue-400/40",
                  )}
                >
                  <Icon icon="mdi:content-copy" className="size-4" aria-hidden />
                  Copy script
                </motion.button>
              </div>
            </div>
            {copied === "script" ? (
              <motion.p
                initial={reduce ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-1.5 text-xs text-success sm:text-right"
              >
                <Icon icon="mdi:check-circle" className="size-4 shrink-0" aria-hidden />
                Script copied to clipboard
              </motion.p>
            ) : null}
          </div>

          <div className="mt-5">
            <div className="mb-1 flex justify-between gap-2">
              <label className={labelClass} htmlFor="msg-content">
                <Icon
                  icon="mdi:message-text-outline"
                  className="size-3.5 shrink-0 text-edge/85"
                  aria-hidden
                />
                Message content
              </label>
              <span className="text-[10px] tabular-nums text-muted">
                {messageContent.length}/2000
              </span>
            </div>
            <textarea
              id="msg-content"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value.slice(0, 2000))}
              placeholder="Optional text above the embed — variables like {user} expand in preview"
              rows={3}
              className="w-full resize-y rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none ring-edge/20 placeholder:text-muted/70 motion-safe:transition focus:border-edge/40 focus:ring-2"
            />
          </div>

          <div className="mt-6">
            <LayoutGroup id="embed-builder-tabs">
              <div className="flex flex-wrap gap-1 rounded-2xl border border-white/[0.08] bg-background/50 p-1">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      "relative rounded-xl px-3.5 py-2.5 text-xs font-semibold motion-safe:transition sm:px-4",
                      tab === t
                        ? "text-foreground"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {tab === t ? (
                      <motion.span
                        layoutId="embed-tab-highlight"
                        className="absolute inset-0 rounded-xl bg-blue-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-edge/35"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 32,
                        }}
                      />
                    ) : null}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <Icon
                        icon={TAB_ICON[t]}
                        className="size-3.5 opacity-90"
                        aria-hidden
                      />
                      {TAB_LABEL[t]}
                    </span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
          </div>

          <div className="mt-6 space-y-4">
            {tab === "general" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="mb-1 flex justify-between">
                    <label className={labelClass} htmlFor="emb-title">
                      <Icon
                        icon="mdi:format-title"
                        className="size-3.5 shrink-0 text-edge/85"
                        aria-hidden
                      />
                      Title
                    </label>
                    <span className="text-[10px] tabular-nums text-muted">
                      {title.length}/256
                    </span>
                  </div>
                  <input
                    id="emb-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 256))}
                    placeholder="Embed title"
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                  />
                </div>
                <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="emb-url">
                      <Icon
                        icon="mdi:link-variant"
                        className="size-3.5 shrink-0 text-edge/85"
                        aria-hidden
                      />
                      URL
                    </label>
                  <input
                    id="emb-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-1 flex justify-between">
                    <label className={labelClass} htmlFor="emb-desc">
                      <Icon
                        icon="mdi:text-box-outline"
                        className="size-3.5 shrink-0 text-edge/85"
                        aria-hidden
                      />
                      Description
                    </label>
                    <span className="text-[10px] tabular-nums text-muted">
                      {description.length}/4096
                    </span>
                  </div>
                  <textarea
                    id="emb-desc"
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value.slice(0, 4096))
                    }
                    placeholder="Description — paste variables from the panel"
                    rows={5}
                    className="w-full resize-y rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                  />
                </div>
                <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="emb-color">
                      <Icon
                        icon="mdi:palette-outline"
                        className="size-3.5 shrink-0 text-edge/85"
                        aria-hidden
                      />
                      Accent color
                    </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id="emb-color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 font-mono text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2 sm:max-w-[11rem]"
                    />
                    <ColorPicker
                      value={color}
                      onChange={setColor}
                      ariaLabel="Pick embed color"
                      presets={COLOR_PRESETS}
                    />
                  </div>
                </div>
                <div>
                    <label className={labelClass} htmlFor="emb-thumb">
                      <Icon
                        icon="mdi:image-size-select-small"
                        className="size-3.5 shrink-0 text-edge/85"
                        aria-hidden
                      />
                      Thumbnail URL
                    </label>
                  <input
                    id="emb-thumb"
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                  />
                </div>
                <div>
                    <label className={labelClass} htmlFor="emb-image">
                      <Icon
                        icon="mdi:image-outline"
                        className="size-3.5 shrink-0 text-edge/85"
                        aria-hidden
                      />
                      Image URL
                    </label>
                  <input
                    id="emb-image"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                  />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={timestamp}
                    onClick={() => setTimestamp((v) => !v)}
                    className={cn(
                      "relative h-8 w-14 rounded-full motion-safe:transition",
                      timestamp ? "bg-edge/55" : "bg-white/[0.1]",
                    )}
                  >
                    <motion.span
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      className="absolute top-1 size-6 rounded-full bg-foreground shadow-md"
                      style={{ left: timestamp ? 32 : 4 }}
                    />
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                    <Icon
                      icon="mdi:clock-outline"
                      className="size-4 text-edge/70"
                      aria-hidden
                    />
                    Include timestamp
                  </span>
                </div>
              </div>
            ) : null}

            {tab === "author" ? (
              <div className="grid gap-4">
                <div>
                  <label className={labelClass} htmlFor="auth-name">
                    <Icon
                      icon="mdi:account-outline"
                      className="size-3.5 shrink-0 text-edge/85"
                      aria-hidden
                    />
                    Author name
                  </label>
                  <input
                    id="auth-name"
                    value={authorName}
                    onChange={(e) =>
                      setAuthorName(e.target.value.slice(0, 256))
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="auth-url">
                    <Icon
                      icon="mdi:link-box-outline"
                      className="size-3.5 shrink-0 text-edge/85"
                      aria-hidden
                    />
                    Author URL
                  </label>
                  <input
                    id="auth-url"
                    value={authorUrl}
                    onChange={(e) => setAuthorUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="auth-icon">
                    <Icon
                      icon="mdi:face-man-profile"
                      className="size-3.5 shrink-0 text-edge/85"
                      aria-hidden
                    />
                    Author icon URL
                  </label>
                  <input
                    id="auth-icon"
                    value={authorIconUrl}
                    onChange={(e) => setAuthorIconUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}

            {tab === "fields" ? (
              <div className="space-y-3">
                {fields.map((f, idx) => (
                  <motion.div
                    key={f.id}
                    {...fieldMotion}
                    className="rounded-xl border border-white/[0.08] bg-background/45 p-3 motion-safe:transition hover:border-white/[0.12]"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <Icon
                          icon="mdi:table-row"
                          className="size-3.5 text-edge/70"
                          aria-hidden
                        />
                        Field {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFields((rows) => rows.filter((r) => r.id !== f.id))
                        }
                        className="inline-flex items-center gap-1 text-xs text-danger motion-safe:transition hover:underline"
                      >
                        <Icon
                          icon="mdi:trash-can-outline"
                          className="size-3.5"
                          aria-hidden
                        />
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
                      className="mb-2 w-full rounded-lg border border-white/[0.08] bg-background/80 px-2 py-1.5 text-sm outline-none motion-safe:transition focus:border-edge/35"
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
                      className="mb-2 w-full resize-y rounded-lg border border-white/[0.08] bg-background/80 px-2 py-1.5 text-sm outline-none motion-safe:transition focus:border-edge/35"
                    />
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <Icon
                        icon="mdi:table-split-cell"
                        className="size-3.5 shrink-0 text-edge/60"
                        aria-hidden
                      />
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
                  </motion.div>
                ))}
                <motion.button
                  type="button"
                  onClick={addField}
                  disabled={fields.length >= 25}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.15] py-3 text-xs font-semibold text-muted motion-safe:transition hover:border-edge/35 hover:bg-white/[0.02] hover:text-foreground disabled:opacity-40"
                >
                  <Icon
                    icon="mdi:table-row-plus-after"
                    className="size-4"
                    aria-hidden
                  />
                  Add field ({fields.length}/25)
                </motion.button>
              </div>
            ) : null}

            {tab === "footer" ? (
              <div className="grid gap-4">
                <div>
                  <label className={labelClass} htmlFor="foot-text">
                    <Icon
                      icon="mdi:format-align-bottom"
                      className="size-3.5 shrink-0 text-edge/85"
                      aria-hidden
                    />
                    Footer text
                  </label>
                  <input
                    id="foot-text"
                    value={footerText}
                    onChange={(e) =>
                      setFooterText(e.target.value.slice(0, 2048))
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="foot-icon">
                    <Icon
                      icon="mdi:sticker-circle-outline"
                      className="size-3.5 shrink-0 text-edge/85"
                      aria-hidden
                    />
                    Footer icon URL
                  </label>
                  <input
                    id="foot-icon"
                    value={footerIconUrl}
                    onChange={(e) => setFooterIconUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-background/80 px-3 py-2 text-sm outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                  />
                </div>
              </div>
            ) : null}

            {tab === "script" ? (
              <div>
                <p className="mb-2 flex items-start gap-2 text-sm text-muted">
                  <Icon
                    icon="mdi:information-outline"
                    className="mt-0.5 size-4 shrink-0 text-edge/80"
                    aria-hidden
                  />
                  <span>
                    Paste after{" "}
                    <code className="font-mono text-xs text-edge">#channel</code>{" "}
                    in Discord (or into your command).
                  </span>
                </p>
                <pre className="max-h-[min(24rem,50vh)] overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/[0.08] bg-[#0c0a0a] p-4 font-mono text-xs leading-relaxed text-accent shadow-inner">
                  {generated || "{embed}$v{title: …}"}
                </pre>
                <button
                  type="button"
                  onClick={() => void copyText("script", generated)}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-edge hover:underline"
                >
                  <Icon icon="mdi:content-copy" className="size-4" aria-hidden />
                  Copy again
                </button>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="min-w-0 space-y-6 xl:col-span-5 2xl:col-span-4">
        <div className="xl:sticky xl:top-[4.5rem] xl:z-10 xl:space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <Icon
                icon="mdi:eye-outline"
                className="size-5 shrink-0 text-edge"
                aria-hidden
              />
              <h3 className="font-display text-sm font-bold tracking-tight text-accent-strong">
                Live preview
              </h3>
            </div>
            <EmbedBuilderLivePreview
              messageContent={displayMessage}
              embed={displayEmbed}
              className="shadow-[0_28px_64px_-28px_rgba(0,0,0,0.85)]"
            />
            <div
              className="rounded-xl border border-white/[0.07] bg-background/55 px-3.5 py-3 text-[11px] leading-relaxed text-muted backdrop-blur-sm sm:px-4"
              role="note"
            >
              <span className="flex items-start gap-2.5">
                <Icon
                  icon="mdi:information-outline"
                  className="mt-0.5 size-4 shrink-0 text-edge/75"
                  aria-hidden
                />
                <span>
                  Tokens like{" "}
                  <code className="rounded bg-surface-elevated px-1 font-mono text-[10px] text-edge">
                    {"{user}"}
                  </code>{" "}
                  appear as written in this preview. In Discord, the bot fills
                  them from the real command context.
                </span>
              </span>
            </div>
          </div>

          <Card
            padding="lg"
            className="border-white/[0.08] bg-surface/45 motion-safe:transition motion-safe:hover:border-white/[0.1]"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <Icon
                icon="mdi:code-braces"
                className="size-5 text-edge"
                aria-hidden
              />
              <h3 className="font-display text-sm font-bold text-accent-strong">
                Variables
              </h3>
            </div>
            <p className="mt-2 flex items-start gap-2 text-xs text-muted">
              <Icon
                icon="mdi:content-copy"
                className="mt-0.5 size-3.5 shrink-0 text-edge/70"
                aria-hidden
              />
              <span>
                Click to copy; paste into any text field. Context matches the
                member running the command.
              </span>
            </p>

            <div className="mt-3 flex flex-wrap gap-1">
              {EMBED_VARIABLE_CATEGORIES.map((c) => (
                <motion.button
                  key={c.id}
                  type="button"
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  onClick={() => setVarCat(c.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold motion-safe:transition",
                    varCat === c.id
                      ? "bg-blue-950/55 text-foreground ring-1 ring-edge/35"
                      : "border border-white/[0.08] text-muted hover:border-white/[0.14] hover:text-foreground",
                  )}
                >
                  <Icon icon={c.icon} className="size-3 opacity-90" aria-hidden />
                  {c.label}
                </motion.button>
              ))}
            </div>

            <ul className="mt-4 max-h-[min(40vh,22rem)] space-y-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-[min(48vh,28rem)]">
              {EMBED_VARIABLE_CATEGORIES.find((c) => c.id === varCat)?.items.map(
                (item) => (
                  <li key={item.key}>
                    <motion.button
                      type="button"
                      whileHover={reduce ? undefined : { y: -1 }}
                      whileTap={reduce ? undefined : { scale: 0.99 }}
                      onClick={() => void copyText(item.key, item.key)}
                      className="flex w-full items-start gap-2 rounded-xl border border-white/[0.06] bg-background/60 px-3 py-2.5 text-left motion-safe:transition hover:border-edge/30 hover:bg-surface-elevated"
                    >
                      <Icon
                        icon="mdi:clipboard-text-outline"
                        className="mt-0.5 size-3.5 shrink-0 text-muted"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <code className="text-xs font-semibold text-edge">
                          {item.key}
                        </code>
                        <div className="mt-0.5 text-[11px] text-muted">
                          {item.description}
                        </div>
                      </div>
                    </motion.button>
                  </li>
                ),
              )}
            </ul>
            {copied && copied !== "script" && copied !== "error" ? (
              <motion.p
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-success"
              >
                <Icon icon="mdi:check" className="size-3.5" aria-hidden />
                Copied {copied}
              </motion.p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
