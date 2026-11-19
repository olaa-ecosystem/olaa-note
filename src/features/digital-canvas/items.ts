/**
 * What can sit on a page (module 03.04, REQ-03-010). Coordinates are page units
 * (see PAGE_WIDTH/PAGE_HEIGHT), so content keeps its place at any zoom and in exports.
 */

/** [x, y, pressure 0..1] */
export type StrokePoint = [number, number, number];

export type InkTool = 'pen' | 'highlighter';

export interface Stroke {
  id: string;
  kind: 'stroke';
  tool: InkTool;
  color: string;
  width: number;
  points: StrokePoint[];
}

export interface TextBox {
  id: string;
  kind: 'text';
  x: number;
  y: number;
  width: number;
  /** Sanitised HTML: b, i, h2, ul, ol, li, p, br only (see richText.ts). */
  html: string;
}

export interface ImageItem {
  id: string;
  kind: 'image';
  fileId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FileItem {
  id: string;
  kind: 'file';
  fileId: string;
  name: string;
  x: number;
  y: number;
}

export type Item = Stroke | TextBox | ImageItem | FileItem;

/** Distance from point p to segment ab. */
function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Stroke eraser hit test: does the stroke pass within `radius` of (x, y)? */
export function strokeHit(stroke: Stroke, x: number, y: number, radius: number): boolean {
  const reach = radius + stroke.width / 2;
  const pts = stroke.points;
  if (pts.length === 1) {
    const p = pts[0]!;
    return Math.hypot(x - p[0], y - p[1]) <= reach;
  }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (segmentDistance(x, y, a[0], a[1], b[0], b[1]) <= reach) return true;
  }
  return false;
}

/** Remove every stroke hit by the eraser at (x, y). Returns `items` itself when nothing changes. */
export function eraseAt(items: Item[], x: number, y: number, radius: number): Item[] {
  const kept = items.filter((it) => it.kind !== 'stroke' || !strokeHit(it, x, y, radius));
  return kept.length === items.length ? items : kept;
}

/** Drop points closer than `minDist` to the previous kept point, to keep stored strokes small. */
export function simplifyPoints(points: StrokePoint[], minDist = 0.75): StrokePoint[] {
  if (points.length < 3) return points;
  const out: StrokePoint[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!;
    const last = out[out.length - 1]!;
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= minDist) out.push(p);
  }
  out.push(points[points.length - 1]!);
  return out;
}

export function roundPoint([x, y, p]: StrokePoint): StrokePoint {
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(p * 100) / 100];
}
