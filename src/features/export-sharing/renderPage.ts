/** Draw a page onto a canvas for export (REQ-03-023): paper or PDF image, images, files, text, ink. */
import { fileUrl } from '../../services/db';
import type { Item, TextBox } from '../digital-canvas/items';
import { HIGHLIGHT_OPACITY, strokePath } from '../inking-tools/strokePath';
import { drawPaper } from '../page-management/paper';
import { pageSize, type Page } from '../page-management/types';
import { toBlocks, type Block } from '../rich-text-editor/richText';
import {
  LINE_HEIGHT,
  TEXT_COLOR,
  TEXT_FONT,
  TEXT_PADDING,
  TEXT_SIZE,
  TEXT_BOLD_WEIGHT,
  TEXT_WEIGHT,
} from '../rich-text-editor/textStyle';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawFileImage(
  ctx: CanvasRenderingContext2D,
  fileId: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const url = await fileUrl(fileId);
  if (!url) return;
  try {
    ctx.drawImage(await loadImage(url), x, y, w, h);
  } catch {
    // Missing or unreadable image: leave the space empty rather than fail the export.
  }
}

function font(block: Block, run: { bold: boolean; italic: boolean }): string {
  const size = TEXT_SIZE[block.kind];
  return `${run.italic ? 'italic ' : ''}${run.bold || block.kind === 'h2' ? TEXT_BOLD_WEIGHT : TEXT_WEIGHT} ${size}px ${TEXT_FONT}`;
}

/** Word-wrap styled runs into the box width and draw them. */
export function drawText(ctx: CanvasRenderingContext2D, box: TextBox): void {
  const maxWidth = box.width - TEXT_PADDING * 2;
  let y = box.y + TEXT_PADDING;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textBaseline = 'top';
  for (const block of toBlocks(box.html)) {
    const size = TEXT_SIZE[block.kind];
    const lineHeight = size * LINE_HEIGHT;
    const indent = block.marker ? 24 : 0;
    let x = 0;
    if (block.marker) {
      ctx.font = font(block, { bold: false, italic: false });
      ctx.fillText(block.marker.trim(), box.x + TEXT_PADDING, y + (lineHeight - size) / 2);
    }
    for (const run of block.runs) {
      ctx.font = font(block, run);
      for (const word of run.text.split(/(\s+)/)) {
        if (!word) continue;
        const w = ctx.measureText(word).width;
        if (x > 0 && x + w > maxWidth - indent && word.trim()) {
          x = 0;
          y += lineHeight;
        }
        if (x === 0 && !word.trim()) continue;
        ctx.fillText(word, box.x + TEXT_PADDING + indent + x, y + (lineHeight - size) / 2);
        x += w;
      }
    }
    y += lineHeight + (block.kind === 'h2' ? 4 : 2);
  }
}

function drawFileCard(ctx: CanvasRenderingContext2D, item: Extract<Item, { kind: 'file' }>) {
  ctx.fillStyle = '#f4f1ea';
  ctx.strokeStyle = '#d8cfbe';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(item.x, item.y, 240, 56, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `700 16px ${TEXT_FONT}`;
  ctx.textBaseline = 'middle';
  const name = item.name.length > 26 ? `${item.name.slice(0, 25)}…` : item.name;
  ctx.fillText(`📎 ${name}`, item.x + 14, item.y + 28);
}

export async function renderPage(page: Page, scale: number): Promise<HTMLCanvasElement> {
  const { width, height } = pageSize(page);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');
  ctx.scale(scale, scale);
  drawPaper(ctx, page.template, width, height);
  if (page.background.kind === 'image') {
    await drawFileImage(ctx, page.background.fileId, 0, 0, width, height);
  }
  for (const item of page.items) {
    if (item.kind === 'image') {
      await drawFileImage(ctx, item.fileId, item.x, item.y, item.width, item.height);
    } else if (item.kind === 'file') {
      drawFileCard(ctx, item);
    } else if (item.kind === 'text') {
      drawText(ctx, item);
    } else {
      ctx.globalAlpha = item.tool === 'highlighter' ? HIGHLIGHT_OPACITY : 1;
      ctx.fillStyle = item.color;
      ctx.fill(new Path2D(strokePath(item)));
      ctx.globalAlpha = 1;
    }
  }
  return canvas;
}
