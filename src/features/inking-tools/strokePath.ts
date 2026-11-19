import { getStroke } from 'perfect-freehand';
import type { Stroke, StrokePoint } from '../digital-canvas/items';

/** Pen and highlighter presets (REQ-03-012). */
export const INK_COLORS = [
  '#22223b',
  '#2d80bb',
  '#d9483b',
  '#3c9a5f',
  '#e87e2d',
  '#8e6cc4',
  '#d8648f',
  '#f2c94c',
] as const;
export const HIGHLIGHT_COLORS = ['#f7e15a', '#9be38a', '#8ecbf5', '#f5a3c7'] as const;
export const PEN_WIDTHS = [2, 4, 7] as const;
export const HIGHLIGHT_WIDTHS = [14, 22, 32] as const;
export const HIGHLIGHT_OPACITY = 0.38;

/** Outline of a stroke as a filled SVG path, with width following pen pressure. */
export function strokePath(stroke: Pick<Stroke, 'points' | 'width' | 'tool'>, last = true): string {
  const outline = getStroke(stroke.points as StrokePoint[], {
    size: stroke.width,
    thinning: stroke.tool === 'pen' ? 0.55 : 0,
    smoothing: 0.5,
    streamline: 0.35,
    simulatePressure: false,
    last,
  });
  return svgPathFromOutline(outline);
}

function svgPathFromOutline(points: number[][]): string {
  const len = points.length;
  if (len < 2) return '';
  const f = (n: number) => Math.round(n * 100) / 100;
  let d = `M${f(points[0]![0]!)},${f(points[0]![1]!)} Q`;
  for (let i = 0; i < len; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[(i + 1) % len]!;
    d += `${f(x0!)},${f(y0!)} ${f((x0! + x1!) / 2)},${f((y0! + y1!) / 2)} `;
  }
  return `${d}Z`;
}
