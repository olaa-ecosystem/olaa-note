/**
 * Import a PDF (REQ-03-020): each PDF page becomes a page image used as the page background,
 * so writing never changes the original (REQ-03-021). Pages are rendered one at a time to keep
 * iPad memory low.
 */
import { db } from '../../services/db';
import { newId } from '../../utils/id';
import { PAGE_WIDTH } from '../page-management/types';

export const MAX_PDF_BYTES = 100 * 1024 * 1024;
/** Render at 2x page width for sharp writing at normal zoom. */
const RENDER_SCALE = 2;

export interface ImportedPage {
  fileId: string;
  width: number;
  height: number;
}

export class PdfImportError extends Error {}

export async function importPdf(
  file: File,
  onProgress: (done: number, total: number) => void,
): Promise<ImportedPage[]> {
  if (file.size > MAX_PDF_BYTES) throw new PdfImportError('File PDF lớn hơn 100 MB.');
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc;
  try {
    doc = await task.promise;
  } catch {
    throw new PdfImportError('Không mở được file PDF này. File có thể bị hỏng hoặc có mật khẩu.');
  }

  const pages: ImportedPage[] = [];
  const base = file.name.replace(/\.pdf$/i, '');
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const unscaled = page.getViewport({ scale: 1 });
    const width = PAGE_WIDTH;
    const height = Math.round((PAGE_WIDTH * unscaled.height) / unscaled.width);
    const viewport = page.getViewport({ scale: (width * RENDER_SCALE) / unscaled.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new PdfImportError('Trình duyệt không hỗ trợ vẽ PDF.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.86),
    );
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
    if (!blob) throw new PdfImportError('Không lưu được trang PDF.');
    const fileId = newId('f-');
    await db.putFile({
      id: fileId,
      name: `${base} — trang ${n}.jpg`,
      type: blob.type,
      size: blob.size,
      blob,
    });
    pages.push({ fileId, width, height });
    onProgress(n, doc.numPages);
  }
  await task.destroy();
  return pages;
}
