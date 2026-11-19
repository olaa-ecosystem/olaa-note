import type { InkPoint, Stroke } from '../../types/note';

export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** True when the circle (x, y, radius) touches the stroke's centre line (plus half its width). */
export function strokeHitTest(stroke: Stroke, x: number, y: number, radius: number): boolean {
  const pts = stroke.points;
  const reach = radius + stroke.width / 2;
  if (pts.length === 1) return Math.hypot(pts[0][0] - x, pts[0][1] - y) <= reach;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    if (distanceToSegment(x, y, ax, ay, bx, by) <= reach) return true;
  }
  return false;
}

/** Remove strokes touched by an eraser circle. Returns the same array when nothing changed. */
export function eraseAt(strokes: Stroke[], x: number, y: number, radius: number): Stroke[] {
  const kept = strokes.filter((s) => !strokeHitTest(s, x, y, radius));
  return kept.length === strokes.length ? strokes : kept;
}

/** Drop points closer than `minDist` to the previous kept point (keeps first and last). */
export function thinPoints(points: InkPoint[], minDist = 0.75): InkPoint[] {
  if (points.length <= 2) return points;
  const out: InkPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = out[out.length - 1];
    if (Math.hypot(points[i][0] - prev[0], points[i][1] - prev[1]) >= minDist) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Round coordinates to 0.1px to keep stored JSON small. */
export function compactPoints(points: InkPoint[]): InkPoint[] {
  return points.map(([x, y, p]) => [
    Math.round(x * 10) / 10,
    Math.round(y * 10) / 10,
    Math.round(p * 100) / 100,
  ]);
}
