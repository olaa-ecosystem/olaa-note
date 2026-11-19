/** Export pages to one PDF and share it (REQ-03-023, REQ-03-024). */
import { pageSize, type Page } from '../page-management/types';
import { renderPage } from './renderPage';

const EXPORT_SCALE = 2;
const PX_TO_PT = 0.75;

export async function exportPdf(
  pages: Page[],
  onProgress: (done: number, total: number) => void,
): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const canvas = await renderPage(page, EXPORT_SCALE);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    canvas.width = 0;
    if (!blob) throw new Error('Không tạo được ảnh trang.');
    const jpg = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const { width, height } = pageSize(page);
    const out = pdf.addPage([width * PX_TO_PT, height * PX_TO_PT]);
    out.drawImage(jpg, { x: 0, y: 0, width: width * PX_TO_PT, height: height * PX_TO_PT });
    onProgress(i + 1, pages.length);
  }
  pdf.setProducer('Olaa TakeNote');
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

/**
 * ASCII file name: some browsers drop a download name with Vietnamese letters or dashes
 * like "—", so "Tiếng Anh — Unit 3" becomes "Tieng Anh - Unit 3.pdf".
 */
export function safeFileName(title: string): string {
  const ascii = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[\u2012-\u2015]/g, '-')
    .replace(/[^A-Za-z0-9 ._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${ascii || 'ghi-chu'}.pdf`;
}

/**
 * Share with the system share sheet where supported (iPad, phones), otherwise download.
 * Returns 'shared', 'downloaded' or 'cancelled'.
 */
export async function shareOrDownload(
  blob: Blob,
  name: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], name, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
}
