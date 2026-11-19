import type { PageTemplate } from './types';

/** Paper patterns (REQ-03-003), shared by the screen (CSS) and exports (canvas). */
export const LINE_GAP = 32;
export const DOT_GAP = 24;
export const PAPER_LINE = '#d9e3ee';
export const PAPER_DOT = '#c3cbd6';

export function paperCss(template: PageTemplate): React.CSSProperties {
  switch (template) {
    case 'lined':
      return {
        backgroundImage: `linear-gradient(to bottom, transparent ${LINE_GAP - 1}px, ${PAPER_LINE} ${LINE_GAP - 1}px)`,
        backgroundSize: `100% ${LINE_GAP}px`,
        backgroundPosition: `0 ${LINE_GAP * 2}px`,
      };
    case 'grid':
      return {
        backgroundImage: `linear-gradient(to bottom, transparent ${LINE_GAP - 1}px, ${PAPER_LINE} ${LINE_GAP - 1}px), linear-gradient(to right, transparent ${LINE_GAP - 1}px, ${PAPER_LINE} ${LINE_GAP - 1}px)`,
        backgroundSize: `${LINE_GAP}px ${LINE_GAP}px`,
      };
    case 'dots':
      return {
        backgroundImage: `radial-gradient(circle, ${PAPER_DOT} 1.4px, transparent 1.6px)`,
        backgroundSize: `${DOT_GAP}px ${DOT_GAP}px`,
      };
    default:
      return {};
  }
}

export function drawPaper(
  ctx: CanvasRenderingContext2D,
  template: PageTemplate,
  width: number,
  height: number,
): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  if (template === 'blank') return;
  if (template === 'dots') {
    ctx.fillStyle = PAPER_DOT;
    for (let y = DOT_GAP / 2; y < height; y += DOT_GAP) {
      for (let x = DOT_GAP / 2; x < width; x += DOT_GAP) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }
  ctx.strokeStyle = PAPER_LINE;
  ctx.lineWidth = 1;
  const startY = template === 'lined' ? LINE_GAP * 2 : 0;
  for (let y = startY + LINE_GAP - 0.5; y < height; y += LINE_GAP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  if (template === 'grid') {
    for (let x = LINE_GAP - 0.5; x < width; x += LINE_GAP) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }
}
