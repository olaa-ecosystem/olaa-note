import { PAGE_HEIGHT, PAGE_WIDTH, type Page, type PaperStyle } from '../../types/note';
import { drawPaper, drawStroke } from './render';

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không tải được ảnh'));
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

/** Render a full page (paper, images, ink) into a canvas at the given scale. */
export async function renderPage(
  canvas: HTMLCanvasElement,
  page: Page,
  paper: PaperStyle,
  scale: number,
): Promise<void> {
  const images = await Promise.all(
    page.images.map((im) => loadImage(im.src).then((el) => ({ im, el })).catch(() => null)),
  );
  canvas.width = Math.round(PAGE_WIDTH * scale);
  canvas.height = Math.round(PAGE_HEIGHT * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawPaper(ctx, paper);
  for (const entry of images) {
    if (entry) ctx.drawImage(entry.el, entry.im.x, entry.im.y, entry.im.w, entry.im.h);
  }
  for (const s of page.strokes) drawStroke(ctx, s);
}

export async function exportPagePng(page: Page, paper: PaperStyle, filename: string): Promise<void> {
  const canvas = document.createElement('canvas');
  await renderPage(canvas, page, paper, 2);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return;
  downloadBlob(blob, filename);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read an image file and downscale it so stored data URLs stay reasonably small. */
export async function fileToImageData(
  file: File,
  maxSide = 1400,
): Promise<{ src: string; width: number; height: number }> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const img = await loadImage(raw);
  const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  if (ratio === 1 && file.size < 600_000) {
    return { src: raw, width: img.naturalWidth, height: img.naturalHeight };
  }
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * ratio);
  c.height = Math.round(img.naturalHeight * ratio);
  c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return { src: c.toDataURL(type, 0.85), width: c.width, height: c.height };
}
