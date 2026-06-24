/* ===== Animated background topology ===== */
/* Self-contained: the topology engine lives directly in this module.      */
/* No external scripts, globals, or custom-event coordination required.   */

import { useEffect, useRef } from "preact/hooks";

interface BackgroundTopologyProps {
  className?: string;
}

/* ===== Minimal 2D vector ===== */
class Vec {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  add(v: Vec): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  mult(n: number): this {
    this.x *= n;
    this.y *= n;
    return this;
  }
  normalize(): this {
    const m = Math.sqrt(this.x * this.x + this.y * this.y);
    if (m > 0) {
      this.x /= m;
      this.y /= m;
    }
    return this;
  }
  static dist(a: Vec, b: Vec): number {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/* ===== Perlin noise (faithful p5.js port: 4 octaves, 0.5 falloff) ===== */
const PERLIN_YWRAPB = 4;
const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
const PERLIN_ZWRAPB = 8;
const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
const PERLIN_SIZE = 4095;
const PERLIN_OCTAVES = 4;
const PERLIN_AMP_FALLOFF = 0.5;
const scaledCosine = (i: number): number => 0.5 * (1.0 - Math.cos(i * Math.PI));
let perlin: number[] | null = null;

function initPerlin(): number[] {
  if (perlin !== null) return perlin;
  const arr = new Array<number>(PERLIN_SIZE + 1);
  for (let i = 0; i <= PERLIN_SIZE; i++) arr[i] = Math.random();
  perlin = arr;
  return arr;
}

function noise(x: number, y = 0, z = 0): number {
  const p = initPerlin();
  if (x < 0) x = -x;
  if (y < 0) y = -y;
  if (z < 0) z = -z;
  let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  let rxf = 0, ryf = 0, r = 0, ampl = PERLIN_AMP_FALLOFF;
  let n1 = 0, n2 = 0, n3 = 0;
  for (let o = 0; o < PERLIN_OCTAVES; o++) {
    let fi = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);
    rxf = scaledCosine(xf);
    ryf = scaledCosine(yf);
    n1 = p[fi & PERLIN_SIZE];
    n1 += rxf * (p[(fi + 1) & PERLIN_SIZE] - n1);
    n2 = p[(fi + PERLIN_YWRAP) & PERLIN_SIZE];
    n2 += rxf * (p[(fi + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
    n1 += ryf * (n2 - n1);
    fi += PERLIN_ZWRAP;
    n2 = p[fi & PERLIN_SIZE];
    n2 += rxf * (p[(fi + 1) & PERLIN_SIZE] - n2);
    n3 = p[(fi + PERLIN_YWRAP) & PERLIN_SIZE];
    n3 += rxf * (p[(fi + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
    n2 += ryf * (n3 - n2);
    n1 += scaledCosine(zf) * (n2 - n1);
    r += n1 * ampl;
    ampl *= PERLIN_AMP_FALLOFF;
    xi <<= 1;
    xf *= 2;
    yi <<= 1;
    yf *= 2;
    zi <<= 1;
    zf *= 2;
    if (xf >= 1) {
      xi++;
      xf--;
    }
    if (yf >= 1) {
      yi++;
      yf--;
    }
    if (zf >= 1) {
      zi++;
      zf--;
    }
  }
  return r;
}

const TAU = Math.PI * 2;

/* Number of points sampled around each grid cell to estimate the local
 * noise gradient. Far fewer than the original 100; the field is smooth
 * and low-frequency so 32 looks identical while cutting init cost
 * roughly linearly (100 → 32 is ~2.8× faster to build). */
const FIELD_SAMPLES = 32;

/* Sample the flow field at a grid cell: returns a vector pointing from the
 * local noise maximum toward the minimum, scaled by the noise range. */
function flowAt(ex: number, ey: number, rad: number): Vec {
  let hi = 0, lo = 1, hx = 0, hy = 0, lx = 0, ly = 0;
  for (let a = 0; a < FIELD_SAMPLES; a++) {
    const c = (a / FIELD_SAMPLES) * TAU;
    const px = ex + Math.cos(c) * rad;
    const py = ey + Math.sin(c) * rad;
    const v = noise(px, py);
    if (v > hi) {
      hi = v;
      hx = px;
      hy = py;
    }
    if (v < lo) {
      lo = v;
      lx = px;
      ly = py;
    }
  }
  return new Vec(lx - hx, ly - hy).normalize().mult(hi - lo);
}

/* Convert "#rrggbb" to an rgba() string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ===== VISUAL COLORS (defaults) ===== */
/* color: single accent (kept for API parity; rendering uses colorPalette). */
/* backgroundColor: canvas backdrop. */
/* colorPalette: symmetric fuchsia gradient interspersed with black;        */
/* each particle is randomly assigned one color at creation.               */
const DEFAULTS = {
  color: "#E879F9",
  backgroundColor: "#000000",
  colorPalette: [
    "#F5D0FE", /* primary-200 */
    "#F0ABFC", /* primary-300 */
    "#F0ABFC", /* primary-300 */
    "#E879F9", /* primary-400 */
    "#E879F9", /* primary-400 */
    "#D946EF", /* primary-500 */
    "#D946EF", /* primary-500 */
    "#C026D3", /* primary-600 */
    "#C026D3", /* primary-600 */
    "#A21CAF", /* primary-700 */
    "#A21CAF", /* primary-700 */
    "#86198F", /* primary-800 */
    "#701A75", /* primary-900 */
    "#000000", /* neutral-1000 */
    "#000000",
    "#000000",
    "#000000",
    "#000000",
    "#000000",
    "#000000",
  ],
};

/* ===== ANIMATION TUNING ===== */
const PARTICLE_COUNT = 1000; // how many particles to render
const PARTICLE_SPEED = 6.4; // how fast particles move through the field
const FLOW_STRENGTH = 5.9; // how strongly particles respond to the field
const LINE_WEIGHT = 0.7; // connecting line thickness
const LINE_ALPHA = 0.05; // connecting line opacity (accumulates over frames)
const LINE_MAX_DIST = 14; // skip lines longer than this (e.g. after wrap)
const WARMUP_FRAMES = 60; // frames pre-rendered before first paint
const MARGIN = 200; // off-screen bleed (matches original +200 / -100 shift)
const CELL = 10; // flow-field grid cell size (px)
const MAX_DPR = 1.5; // cap backing-store DPR to limit memory on retina

interface TopologyOptions {
  el: HTMLElement;
  color?: string;
  backgroundColor?: string;
  colorPalette?: string[];
}

type TopologyConfig = {
  el: HTMLElement;
  color: string;
  backgroundColor: string;
  colorPalette: string[];
};

interface Particle {
  prev: Vec;
  pos: Vec;
  vel: Vec;
  acc: Vec;
  color: string;
}

class Topology {
  private options: TopologyConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private field: Vec[][] = [];
  private parts: Particle[] = [];
  private _raf = 0;

  /* Arrow-function property so `this` is always correct when used as a
   * requestAnimationFrame callback. */
  private _frame = (): void => {
    this._update();
    this._draw();
    this._raf = requestAnimationFrame(this._frame);
  };

  constructor(options: TopologyOptions) {
    this.options = {
      el: options.el,
      color: options.color ?? DEFAULTS.color,
      backgroundColor: options.backgroundColor ?? DEFAULTS.backgroundColor,
      colorPalette: options.colorPalette ?? DEFAULTS.colorPalette,
    };
    const el = options.el;

    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

    this.canvas = document.createElement("canvas");
    this.canvas.classList.add("vanta-canvas");
    Object.assign(this.canvas.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: "0",
      background: this.options.backgroundColor,
    });
    el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;

    this._build(true);
    this._raf = requestAnimationFrame(this._frame);
  }

  /* Generate the flow field + particles and (optionally) pre-warm the
   * accumulation buffer so the topology is fully formed before it is
   * ever shown.
   *
   * The backing store is a square sized to the device's largest screen
   * axis. CSS stretches it to fill the container, so resizing or rotating
   * never requires a rebuild — the bitmap is always at least as large as
   * either dimension. */
  private _build(warmup: boolean): void {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, MAX_DPR);
    this.dpr = dpr;
    const side = Math.max(screen.width, screen.height, MARGIN);
    this.width = side;
    this.height = side;
    this.canvas.width = Math.round(side * dpr);
    this.canvas.height = Math.round(side * dpr);

    const cols = (side + MARGIN) / CELL;
    const rows = (side + MARGIN) / CELL;
    const field: Vec[][] = [];
    for (let e = 0; e < rows; e++) {
      const row: Vec[] = [];
      for (let s = 0; s < cols; s++) {
        row.push(flowAt(0.003 * s, 0.003 * e, 0.1));
      }
      field.push(row);
    }
    this.field = field;

    const count = PARTICLE_COUNT;
    const palette = this.options.colorPalette;
    const parts: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * (side + MARGIN);
      const y = Math.random() * (side + MARGIN);
      parts.push({
        prev: new Vec(x, y),
        pos: new Vec(x, y),
        vel: new Vec(0, 0),
        acc: new Vec(0, 0),
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    }
    this.parts = parts;

    // Clear once, then pre-accumulate warm-up frames.
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (warmup) {
      for (let k = 0; k < WARMUP_FRAMES; k++) {
        this._update();
        this._draw();
      }
    }
  }

  /* Advance every particle one step along the flow field. */
  private _update(): void {
    const W = this.width + MARGIN, H = this.height + MARGIN;
    const field = this.field, parts = this.parts;
    const mod = (e: number, t: number): number => ((e % t) + t) % t;
    const clamp = (v: number, lo: number, hi: number): number =>
      v < lo ? lo : v > hi ? hi : v;
    for (let i = 0; i < parts.length; i++) {
      const o = parts[i];
      const cx = clamp(o.pos.x, 0, W);
      const cy = clamp(o.pos.y, 0, H);
      const n = field[Math.floor(cy / CELL)][Math.floor(cx / CELL)];
      o.prev.x = o.pos.x;
      o.prev.y = o.pos.y;
      o.pos.x = mod(o.pos.x + o.vel.x, W);
      o.pos.y = mod(o.pos.y + o.vel.y, H);
      o.vel.add(o.acc).normalize().mult(PARTICLE_SPEED);
      o.acc.x = 0;
      o.acc.y = 0;
      o.acc.add(n).mult(FLOW_STRENGTH);
    }
  }

  /* Draw one low-alpha line segment per particle. The canvas is never
   * cleared between frames, so these faint segments accumulate into the
   * visible topology. */
  private _draw(): void {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const parts = this.parts;
    // Mirror the original p5 translate(-100, -100), scaled for DPR.
    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      -(MARGIN / 2) * dpr,
      -(MARGIN / 2) * dpr,
    );
    ctx.lineWidth = LINE_WEIGHT;
    for (let e = 0; e < parts.length; e++) {
      const p = parts[e];
      if (Vec.dist(p.prev, p.pos) < LINE_MAX_DIST) {
        ctx.strokeStyle = hexToRgba(p.color, LINE_ALPHA);
        ctx.beginPath();
        ctx.moveTo(p.prev.x, p.prev.y);
        ctx.lineTo(p.pos.x, p.pos.y);
        ctx.stroke();
      }
    }
  }

  destroy(): void {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

export default function BackgroundTopology(
  { className }: BackgroundTopologyProps,
) {
  const topologyRef = useRef<Topology | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (topologyRef.current || !containerRef.current) {
      return;
    }

    try {
      topologyRef.current = new Topology({ el: containerRef.current });
      // The constructor pre-warms WARMUP_FRAMES synchronously, so by the
      // next paint the topology is already formed. Fade the container in
      // to smooth over any first-paint flash.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.style.opacity = "1";
          }
        })
      );
    } catch (error) {
      console.error("BackgroundTopology: Failed to initialize:", error);
    }

    return () => {
      if (topologyRef.current) {
        topologyRef.current.destroy();
        topologyRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="vanta-background"
      class={`fixed inset-0 w-full h-full ${className || ""}`}
      style={{
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0,
        minHeight: "100dvh",
        minWidth: "100vw",
      }}
    />
  );
}
