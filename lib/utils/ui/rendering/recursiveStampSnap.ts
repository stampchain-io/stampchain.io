/* ===== RECURSIVE STAMP SMART SNAP / MEASURE ===== */
import type { RecursiveStampGuide, RecursiveStampLayer } from "$types/ui.d.ts";

export const SMART_SNAP_T = 1;

export type SmartGuideLine = { type: "h" | "v"; pos: number };

export type MeasureBadge = {
  left: number;
  top: number;
  text: string;
};

export function snapTargets(
  layers: RecursiveStampLayer[],
  guides: RecursiveStampGuide[],
  movingIds: string[],
): { xs: number[]; ys: number[] } {
  const xs = [0, 50, 100];
  const ys = [0, 50, 100];
  layers.forEach((l) => {
    if (movingIds.includes(l.id) || !l.vis) return;
    xs.push(l.x, l.x + l.w / 2, l.x + l.w);
    ys.push(l.y, l.y + l.h / 2, l.y + l.h);
  });
  guides.forEach((g) => {
    if (g.type === "v") xs.push(g.pos);
    else ys.push(g.pos);
  });
  return { xs, ys };
}

function nearestSnap(
  values: number[],
  lines: number[],
): { diff: number; line: number } | null {
  let bestDiff = 0;
  let bestLine = 0;
  let found = false;
  for (const val of values) {
    for (const line of lines) {
      const diff = line - val;
      if (
        Math.abs(diff) < SMART_SNAP_T &&
        (!found || Math.abs(diff) < Math.abs(bestDiff))
      ) {
        found = true;
        bestDiff = diff;
        bestLine = line;
      }
    }
  }
  return found ? { diff: bestDiff, line: bestLine } : null;
}

export function snapMove(
  x: number,
  y: number,
  w: number,
  h: number,
  movingIds: string[],
  layers: RecursiveStampLayer[],
  guides: RecursiveStampGuide[],
): { dx: number; dy: number; lines: SmartGuideLine[] } {
  const { xs, ys } = snapTargets(layers, guides, movingIds);
  const sx = nearestSnap([x, x + w / 2, x + w], xs);
  const sy = nearestSnap([y, y + h / 2, y + h], ys);
  const out: SmartGuideLine[] = [];
  if (sx) out.push({ type: "v", pos: sx.line });
  if (sy) out.push({ type: "h", pos: sy.line });
  return {
    dx: sx ? sx.diff : 0,
    dy: sy ? sy.diff : 0,
    lines: out,
  };
}

export function measureBadges(
  layer: RecursiveStampLayer,
  layers: RecursiveStampLayer[],
): MeasureBadge[] {
  const peers = layers.filter((o) => o.id !== layer.id && o.vis);
  const lT = layer.y;
  const lB = layer.y + layer.h;
  const lL = layer.x;
  const lR = layer.x + layer.w;
  const lCy = layer.y + layer.h / 2;
  const lCx = layer.x + layer.w / 2;
  const badges: MeasureBadge[] = [];

  const vOverlap = peers.filter((o) => o.y < lB && o.y + o.h > lT);
  const leftP =
    vOverlap.filter((o) => o.x + o.w <= lL).sort((a, b) =>
      (lL - (b.x + b.w)) - (lL - (a.x + a.w))
    )[0];
  const rightP =
    vOverlap.filter((o) => o.x >= lR).sort((a, b) =>
      (a.x - lR) - (b.x - lR)
    )[0];
  if (leftP) {
    const gap = lL - (leftP.x + leftP.w);
    if (gap >= 0) {
      badges.push({
        left: lL - gap / 2,
        top: lCy,
        text: `${gap.toFixed(1)}%`,
      });
    }
  }
  if (rightP) {
    const gap = rightP.x - lR;
    if (gap >= 0) {
      badges.push({
        left: lR + gap / 2,
        top: lCy,
        text: `${gap.toFixed(1)}%`,
      });
    }
  }

  const hOverlap = peers.filter((o) => o.x < lR && o.x + o.w > lL);
  const topP =
    hOverlap.filter((o) => o.y + o.h <= lT).sort((a, b) =>
      (lT - (b.y + b.h)) - (lT - (a.y + a.h))
    )[0];
  const botP =
    hOverlap.filter((o) => o.y >= lB).sort((a, b) =>
      (a.y - lB) - (b.y - lB)
    )[0];
  if (topP) {
    const gap = lT - (topP.y + topP.h);
    if (gap >= 0) {
      badges.push({
        left: lCx,
        top: lT - gap / 2,
        text: `${gap.toFixed(1)}%`,
      });
    }
  }
  if (botP) {
    const gap = botP.y - lB;
    if (gap >= 0) {
      badges.push({
        left: lCx,
        top: lB + gap / 2,
        text: `${gap.toFixed(1)}%`,
      });
    }
  }
  return badges;
}

export function layerHitsMarquee(
  layer: RecursiveStampLayer,
  mx0: number,
  my0: number,
  mx1: number,
  my1: number,
): boolean {
  if (!layer.vis) return false;
  const x0 = Math.min(mx0, mx1);
  const y0 = Math.min(my0, my1);
  const x1 = Math.max(mx0, mx1);
  const y1 = Math.max(my0, my1);
  return layer.x < x1 && layer.x + layer.w > x0 &&
    layer.y < y1 && layer.y + layer.h > y0;
}
