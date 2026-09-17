/* ===== COLOR PICKER ===== */
import { Icon } from "$icon";
import { container3 } from "$layout";
import { textXs } from "$text";
import type { ColorPickerProps } from "$types/ui.d.ts";
import type { JSX } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";

type Hsv = { h: number; s: number; v: number };
type Format = "hex" | "rgb";

const PICKER_W = 232;
const HUE_GRAD =
  "linear-gradient(to right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3
    ? raw.split("").map((c) => c + c).join("")
    : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb(
  h: number,
  s: number,
  v: number,
): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hsvToHex(hsv: Hsv): string {
  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
  return rgbToHex(r, g, b);
}

function hsvFromHex(hex: string): Hsv {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, v: 0 };
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

function svBackground(h: number): string {
  return `linear-gradient(to top,#000,transparent),` +
    `linear-gradient(to right,#fff,hsl(${h},100%,50%))`;
}

const fieldClass = `h-8 rounded-2xl bg-[#0a0a0a] border border-color-neutral-700
  text-color-neutral-200 font-mono text-xs px-3
  focus:outline-none focus:border-color-primary-400`;

export function ColorPicker({
  value,
  onChange,
  ariaLabel = "Color",
  showValue = false,
  class: extraClass = "",
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("hex");
  const [hsv, setHsv] = useState<Hsv>(() => hsvFromHex(value));
  const [hexDraft, setHexDraft] = useState(value);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [canDrop, setCanDrop] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hsvRef = useRef(hsv);
  const hexFocused = useRef(false);
  hsvRef.current = hsv;

  useEffect(() => {
    const ED = (globalThis as { EyeDropper?: unknown }).EyeDropper;
    setCanDrop(typeof ED === "function");
  }, []);

  useEffect(() => {
    const next = hsvFromHex(value);
    setHsv((prev) => {
      if (next.v === 0) return { ...prev, v: 0, s: next.s || prev.s };
      if (next.s === 0) return { ...prev, s: 0, v: next.v };
      return next;
    });
    if (!hexFocused.current) setHexDraft(value);
  }, [value]);

  useEffect(() => {
    if (open) setFormat("hex");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const t = triggerRef.current;
      const p = popoverRef.current;
      if (!t) return;
      const tr = t.getBoundingClientRect();
      const pw = p?.offsetWidth || PICKER_W;
      const ph = p?.offsetHeight || 300;
      let top = tr.bottom + 8;
      let left = tr.left;
      const vw = globalThis.innerWidth;
      const vh = globalThis.innerHeight;
      if (left + pw > vw - 8) left = vw - pw - 8;
      if (left < 8) left = 8;
      if (top + ph > vh - 8) top = tr.top - ph - 8;
      if (top < 8) top = 8;
      setPos({ top, left });
    };
    place();
    const id = requestAnimationFrame(place);
    globalThis.addEventListener("resize", place);
    globalThis.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(id);
      globalThis.removeEventListener("resize", place);
      globalThis.removeEventListener("scroll", place, true);
    };
  }, [open, format]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
        return;
      }
      const node = e.target as Node;
      if (triggerRef.current?.contains(node)) return;
      if (popoverRef.current?.contains(node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onDoc);
    };
  }, [open]);

  const commit = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexDraft(hex);
    onChange(hex);
  };

  const onSvPointer = (
    e: JSX.TargetedPointerEvent<HTMLDivElement>,
  ) => {
    if (e.type === "pointerdown") {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (
      e.type === "pointermove" &&
      !e.currentTarget.hasPointerCapture(e.pointerId)
    ) {
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const s = clamp((e.clientX - r.left) / r.width, 0, 1);
    const v = 1 - clamp((e.clientY - r.top) / r.height, 0, 1);
    commit({ ...hsvRef.current, s, v });
  };

  const onHuePointer = (
    e: JSX.TargetedPointerEvent<HTMLDivElement>,
  ) => {
    if (e.type === "pointerdown") {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (
      e.type === "pointermove" &&
      !e.currentTarget.hasPointerCapture(e.pointerId)
    ) {
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const h = clamp((e.clientX - r.left) / r.width, 0, 1) * 360;
    commit({ ...hsvRef.current, h });
  };

  const pickEyeDropper = async () => {
    const Ctor = (globalThis as {
      EyeDropper?: new () => {
        open: () => Promise<{ sRGBHex: string }>;
      };
    }).EyeDropper;
    if (!Ctor) return;
    try {
      const { sRGBHex } = await new Ctor().open();
      const rgb = hexToRgb(sRGBHex);
      if (!rgb) return;
      commit(rgbToHsv(rgb.r, rgb.g, rgb.b));
    } catch {
      /* cancelled */
    }
  };

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const ri = Math.round(rgb.r);
  const gi = Math.round(rgb.g);
  const bi = Math.round(rgb.b);

  const toggleOpen = () => {
    if (!open && triggerRef.current) {
      const tr = triggerRef.current.getBoundingClientRect();
      setPos({ top: tr.bottom + 8, left: tr.left });
      setFormat("hex");
    }
    setOpen((v) => !v);
  };

  const applyHexInput = (raw: string) => {
    setHexDraft(raw);
    const digits = raw.replace("#", "").trim();
    if (digits.length !== 6) return;
    const parsed = hexToRgb(raw);
    if (!parsed) return;
    setHsv(rgbToHsv(parsed.r, parsed.g, parsed.b));
    onChange(rgbToHex(parsed.r, parsed.g, parsed.b));
  };

  const onHexFocus = () => {
    hexFocused.current = true;
  };

  const onHexBlur = () => {
    hexFocused.current = false;
    setHexDraft(hsvToHex(hsvRef.current));
  };

  const swatch = (
    <button
      ref={triggerRef}
      type="button"
      aria-label={ariaLabel}
      aria-expanded={open}
      onClick={toggleOpen}
      class={showValue
        ? "w-6.5 h-6.5 rounded-full shrink-0 cursor-pointer"
        : `w-6 h-6 rounded-full shrink-0 cursor-pointer ${extraClass}`}
      style={{ backgroundColor: value }}
    />
  );

  const trigger = showValue
    ? (
      <div
        class={`flex justify-between w-full ${container3} !rounded-full py-1 pl-1 ${extraClass}`}
      >
        {swatch}
        <input
          type="text"
          spellcheck={false}
          value={hexDraft}
          aria-label={`${ariaLabel} hex`}
          class={`${textXs} w-20 mr-1 px-3 py-1
            bg-transparent border-0 outline-none text-right
            cursor-text select-text`}
          onFocus={onHexFocus}
          onBlur={onHexBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          onInput={(e) => {
            applyHexInput((e.target as HTMLInputElement).value);
          }}
        />
      </div>
    )
    : swatch;

  const popover = open && typeof document !== "undefined" &&
    createPortal(
      <div
        ref={popoverRef}
        class="fixed z-tooltip w-[232px] overflow-hidden rounded-3xl
          border border-color-neutral-700 bg-[#111111]
          text-color-neutral-200
          shadow-[0_8px_40px_rgba(0,0,0,0.65)]"
        style={{
          top: pos.top,
          left: pos.left,
        }}
      >
        <div
          class="relative h-[168px] w-full cursor-crosshair touch-none"
          style={{ background: svBackground(hsv.h) }}
          onPointerDown={onSvPointer}
          onPointerMove={onSvPointer}
        >
          <span
            class="absolute w-3.5 h-3.5 rounded-full border-2 border-white
              pointer-events-none -translate-x-1/2 -translate-y-1/2
              shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
            style={{
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
            }}
          />
        </div>
        <div class="flex flex-col gap-2 p-3 bg-[#111111]">
          <div class="flex items-center gap-2">
            {canDrop && (
              <button
                type="button"
                aria-label="Eyedropper"
                onClick={pickEyeDropper}
                class="w-6 h-6 shrink-0 flex items-center justify-center
                  rounded-full hover:bg-color-neutral-800"
              >
                <Icon
                  type="iconButton"
                  name="dropper"
                  weight="normal"
                  size="xxs"
                  color="neutral400"
                  ariaLabel="Eyedropper"
                />
              </button>
            )}
            <span
              class="w-6 h-6 rounded-full shrink-0 border
                border-color-neutral-600"
              style={{ backgroundColor: hsvToHex(hsv) }}
            />
            <div
              class="relative h-3 flex-1 ml-2 rounded-full cursor-pointer
                touch-none"
              style={{ background: HUE_GRAD }}
              onPointerDown={onHuePointer}
              onPointerMove={onHuePointer}
            >
              <span
                class="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white
                  border border-color-neutral-600 pointer-events-none
                  -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${(hsv.h / 360) * 100}%` }}
              />
            </div>
          </div>
          {format === "hex"
            ? (
              <input
                type="text"
                spellcheck={false}
                value={hexDraft}
                class={`${fieldClass} w-full uppercase`}
                onFocus={onHexFocus}
                onBlur={onHexBlur}
                onInput={(e) => {
                  applyHexInput((e.target as HTMLInputElement).value);
                }}
              />
            )
            : (
              <div class="grid grid-cols-3 gap-1.5">
                {([
                  ["R", ri],
                  ["G", gi],
                  ["B", bi],
                ] as const).map(([label, n]) => (
                  <label key={label} class="flex flex-col gap-0.5">
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={n}
                      class={`${fieldClass} w-full text-center px-1`}
                      onInput={(e) => {
                        const v = clamp(
                          parseInt(
                            (e.target as HTMLInputElement).value,
                            10,
                          ) || 0,
                          0,
                          255,
                        );
                        const next = {
                          r: label === "R" ? v : ri,
                          g: label === "G" ? v : gi,
                          b: label === "B" ? v : bi,
                        };
                        commit(rgbToHsv(next.r, next.g, next.b));
                      }}
                    />
                    <span class="text-[0.625rem] text-center
                      text-color-neutral-500">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          <button
            type="button"
            class={`flex items-center justify-between w-full ${fieldClass}
              uppercase tracking-wide cursor-pointer`}
            onClick={() => setFormat((f) => (f === "hex" ? "rgb" : "hex"))}
          >
            <span>{format}</span>
            <span class="flex flex-col text-[7px] leading-none
              text-color-neutral-500">
              <span>▲</span>
              <span>▼</span>
            </span>
          </button>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {trigger}
      {popover}
    </>
  );
}
