"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Hsv = { h: number; s: number; v: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseHex(raw: string): { r: number; g: number; b: number } | null {
  const h = raw.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = Number.parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const n = (clamp(r, 0, 255) << 16) | (clamp(g, 0, 255) << 8) | clamp(b, 0, 255);
  return `#${n.toString(16).padStart(6, "0")}`;
}

function rgbToHsv({ r, g, b }: { r: number; g: number; b: number }): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb({ h, s, v }: Hsv): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function hueToHex(h: number): string {
  return toHex(hsvToRgb({ h, s: 1, v: 1 }));
}

function percentFromClientX(el: HTMLElement, clientX: number): number {
  const r = el.getBoundingClientRect();
  if (r.width <= 0) return 0;
  return clamp((clientX - r.left) / r.width, 0, 1);
}

function percentFromClientY(el: HTMLElement, clientY: number): number {
  const r = el.getBoundingClientRect();
  if (r.height <= 0) return 0;
  return clamp((clientY - r.top) / r.height, 0, 1);
}

type Preset = { hex: string; label?: string };

type Props = {
  value: string;
  onChange(next: string): void;
  id?: string;
  ariaLabel?: string;
  presets?: readonly Preset[];
  className?: string;
};

export function ColorPicker({
  value,
  onChange,
  id,
  ariaLabel = "Pick a color",
  presets,
  className,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const satRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseHex(value) ?? parseHex("#ef4444")!, [value]);
  const externalHsv = useMemo(() => rgbToHsv(parsed), [parsed]);

  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<Hsv>(externalHsv);

  useEffect(() => {
    setHsv(externalHsv);
  }, [externalHsv.h, externalHsv.s, externalHsv.v]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const commit = useCallback(
    (next: Hsv) => {
      const rgb = hsvToRgb(next);
      onChange(toHex(rgb));
    },
    [onChange],
  );

  const setHueFromEvent = useCallback(
    (clientX: number) => {
      const el = hueRef.current;
      if (!el) return;
      const p = percentFromClientX(el, clientX);
      const next = { ...hsv, h: p * 360 };
      setHsv(next);
      commit(next);
    },
    [commit, hsv],
  );

  const setSatFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = satRef.current;
      if (!el) return;
      const px = percentFromClientX(el, clientX);
      const py = percentFromClientY(el, clientY);
      const next = { ...hsv, s: px, v: 1 - py };
      setHsv(next);
      commit(next);
    },
    [commit, hsv],
  );

  const startDrag = (kind: "hue" | "sat") => (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (kind === "hue") setHueFromEvent(e.clientX);
    else setSatFromEvent(e.clientX, e.clientY);
  };

  const onDrag = (kind: "hue" | "sat") => (e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    if (kind === "hue") setHueFromEvent(e.clientX);
    else setSatFromEvent(e.clientX, e.clientY);
  };

  const swatch = useMemo(() => {
    const ok = /^#[0-9a-fA-F]{6}$/.test(value.trim());
    return ok ? value.trim() : "#ef4444";
  }, [value]);

  const hueHex = useMemo(() => hueToHex(hsv.h), [hsv.h]);
  const satX = `${Math.round(hsv.s * 100)}%`;
  const satY = `${Math.round((1 - hsv.v) * 100)}%`;
  const hueX = `${Math.round((hsv.h / 360) * 100)}%`;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.12] bg-black/20",
          "motion-safe:transition hover:border-edge/40 hover:bg-white/[0.03]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        title="Color picker"
      >
        <span
          className="h-7 w-7 rounded-lg ring-1 ring-black/40"
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Color picker"
          className="absolute right-0 top-[calc(100%+10px)] z-[140] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#161010] shadow-[0_24px_72px_-18px_rgba(0,0,0,0.92)]"
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Color
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="size-9 shrink-0 rounded-xl border border-white/[0.12] ring-1 ring-black/40"
                    style={{ backgroundColor: swatch }}
                    aria-hidden
                  />
                  <input
                    value={swatch}
                    onChange={(e) => {
                      const next = e.target.value;
                      onChange(next);
                      const rgb = parseHex(next);
                      if (rgb) setHsv(rgbToHsv(rgb));
                    }}
                    inputMode="text"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-background/70 px-3 py-2 font-mono text-sm text-foreground outline-none ring-edge/20 motion-safe:transition focus:border-edge/40 focus:ring-2"
                    aria-label="Hex color"
                  />
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20 text-muted motion-safe:transition hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-foreground"
                    aria-label="Close color picker"
                  >
                    <Icon icon="mdi:close" className="size-5" aria-hidden />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div
                ref={satRef}
                onPointerDown={startDrag("sat")}
                onPointerMove={onDrag("sat")}
                className={cn(
                  "relative h-36 w-full cursor-crosshair overflow-hidden rounded-2xl border border-white/[0.1]",
                  "bg-[linear-gradient(to_right,#fff,rgba(255,255,255,0))]",
                  "motion-safe:transition hover:border-white/[0.14]",
                )}
                style={{ backgroundColor: hueHex }}
                role="presentation"
              >
                <div
                  className="absolute inset-0 bg-[linear-gradient(to_top,#000,rgba(0,0,0,0))]"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: satX, top: satY }}
                  aria-hidden
                >
                  <div className="size-4 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.35)]" />
                </div>
              </div>

              <div
                ref={hueRef}
                onPointerDown={startDrag("hue")}
                onPointerMove={onDrag("hue")}
                className="relative h-3.5 w-full cursor-pointer rounded-full border border-white/[0.1] bg-[linear-gradient(to_right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]"
                role="presentation"
              >
                <div
                  className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: hueX }}
                  aria-hidden
                >
                  <div className="size-4 rounded-full border-2 border-white bg-black/30 shadow-[0_0_0_2px_rgba(0,0,0,0.35)]" />
                </div>
              </div>
            </div>

            {presets?.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  presets
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => onChange(p.hex)}
                      className={cn(
                        "size-8 rounded-xl border-2 motion-safe:transition",
                        swatch.toLowerCase() === p.hex.toLowerCase()
                          ? "border-white shadow-[0_0_12px_-2px_rgba(255,255,255,0.45)]"
                          : "border-transparent hover:border-white/30",
                      )}
                      style={{ backgroundColor: p.hex }}
                      aria-label={p.label ? `Preset ${p.label}` : `Preset ${p.hex}`}
                      title={p.label ?? p.hex}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

