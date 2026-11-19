import { PAGE_HEIGHT, PAGE_WIDTH, type InkPoint, type PaperStyle, type Stroke } from '../../types/note';

const PAPER_LINE = 'rgba(80, 110, 160, 0.22)';
const PAPER_MARGIN = 'rgba(214, 90, 90, 0.35)';
const SPACING = 36;

export function drawPaper(ctx: CanvasRenderingContext2D, paper: PaperStyle): void {
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.save();
  ctx.lineWidth = 1;
  if (paper === 'lined') {
    ctx.strokeStyle = PAPER_LINE;
    for (let y = SPACING * 3; y < PAGE_HEIGHT - SPACING; y += SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(PAGE_WIDTH, y + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = PAPER_MARGIN;
    ctx.beginPath();
    ctx.moveTo(96.5, 0);
    ctx.lineTo(96.5, PAGE_HEIGHT);
    ctx.stroke();
  } else if (paper === 'grid') {
    ctx.strokeStyle = PAPER_LINE;
    for (let x = SPACING / 2; x < PAGE_WIDTH; x += SPACING / 1.5) {
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, PAGE_HEIGHT);
      ctx.stroke();
    }
    for (let y = SPACING / 2; y < PAGE_HEIGHT; y += SPACING / 1.5) {
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(PAGE_WIDTH, Math.round(y) + 0.5);
      ctx.stroke();
    }
  } else if (paper === 'dotted') {
    ctx.fillStyle = 'rgba(60, 80, 120, 0.35)';
    for (let x = SPACING / 2; x < PAGE_WIDTH; x += SPACING / 1.5) {
      for (let y = SPACING / 2; y < PAGE_HEIGHT; y += SPACING / 1.5) {
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function widthAt(stroke: Stroke, p: InkPoint): number {
  if (stroke.tool === 'highlighter') return stroke.width;
  // Pressure 0.5 (mouse default) → nominal width.
  return Math.max(0.6, stroke.width * (0.35 + p[2] * 1.3));
}

/** Draw a full stroke with midpoint-quadratic smoothing. */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const pts = stroke.points;
  if (pts.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;

  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.32;
    ctx.globalCompositeOperation = 'multiply';
    ctx.lineCap = 'butt';
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], widthAt(stroke, pts[0]) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Variable width: draw each smoothed segment with the pressure at its control point.
  let prevMid: [number, number] = [pts[0][0], pts[0][1]];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const next = pts[i + 1];
    const mid: [number, number] = next ? [(p[0] + next[0]) / 2, (p[1] + next[1]) / 2] : [p[0], p[1]];
    ctx.beginPath();
    ctx.lineWidth = widthAt(stroke, p);
    ctx.moveTo(prevMid[0], prevMid[1]);
    ctx.quadraticCurveTo(p[0], p[1], mid[0], mid[1]);
    ctx.stroke();
    prevMid = mid;
  }
  ctx.restore();
}

/** Draw only the tail of an in-progress stroke (cheap incremental rendering). */
export function drawStrokeTail(ctx: CanvasRenderingContext2D, stroke: Stroke, fromIndex: number): void {
  const pts = stroke.points;
  if (stroke.tool === 'highlighter') return; // highlighter is redrawn whole on the live layer
  const start = Math.max(1, fromIndex);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  for (let i = start; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    ctx.beginPath();
    ctx.lineWidth = widthAt(stroke, b);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();
}
