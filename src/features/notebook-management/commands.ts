/** Multi-step actions that touch both the store and file storage. */
import { db } from '../../services/db';
import { addPage, createNotebook, newPage } from '../../stores/noteActions';
import { noteStore } from '../../stores/noteStore';
import { newId } from '../../utils/id';
import type { FileItem, ImageItem } from '../digital-canvas/items';
import { importPdf } from '../document-annotation/importPdf';
import { pageSize, type PageTemplate } from '../page-management/types';
import type { NotebookColor } from './types';

export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

export function createEmptyNotebook(
  title: string,
  color: NotebookColor,
  template: PageTemplate,
): string {
  const id = newId('n-');
  noteStore.update((s) =>
    createNotebook(s, { id, title, color, template, firstPageId: newId('p-') }, Date.now()),
  );
  void db.persist();
  return id;
}

/** Add one page per PDF page after `index` (or as a new notebook). Returns the first new page's index. */
export async function insertPdf(
  file: File,
  target: { notebookId: string; index: number } | { newNotebook: NotebookColor },
  onProgress: (done: number, total: number) => void,
): Promise<{ notebookId: string; firstPage: number }> {
  const imported = await importPdf(file, onProgress);
  const now = Date.now();
  let notebookId: string;
  let index: number;
  if ('newNotebook' in target) {
    notebookId = newId('n-');
    const firstPageId = newId('p-');
    noteStore.update((s) => {
      const withNb = createNotebook(
        s,
        {
          id: notebookId,
          title: file.name.replace(/\.pdf$/i, ''),
          color: target.newNotebook,
          template: 'blank',
          firstPageId,
        },
        now,
      );
      const first = imported[0];
      if (!first) return withNb;
      return {
        ...withNb,
        pages: {
          ...withNb.pages,
          [firstPageId]: {
            ...withNb.pages[firstPageId]!,
            background: { kind: 'image', fileId: first.fileId },
            size: { width: first.width, height: first.height },
          },
        },
      };
    });
    index = 0;
    imported.shift();
    void db.persist();
  } else {
    notebookId = target.notebookId;
    index = target.index;
  }
  noteStore.update((s) => {
    let next = s;
    imported.forEach((p, i) => {
      const page = {
        ...newPage(newId('p-'), notebookId, 'blank', now, { kind: 'image', fileId: p.fileId }),
        size: { width: p.width, height: p.height },
      };
      next = addPage(next, notebookId, index + ('newNotebook' in target ? 1 : 0) + i, page, now);
    });
    return next;
  });
  return { notebookId, firstPage: index + 1 };
}

function imageSize(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable image'));
    };
    img.src = url;
  });
}

/** Add an image or any file to a page (REQ-03-022). Returns the new item id. */
export async function attachFile(pageId: string, file: File): Promise<string> {
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('Tệp lớn hơn 50 MB.');
  const page = noteStore.getState().pages[pageId];
  if (!page) throw new Error('Không tìm thấy trang.');
  const { width: pw, height: ph } = pageSize(page);
  const fileId = newId('f-');
  await db.putFile({ id: fileId, name: file.name, type: file.type, size: file.size, blob: file });
  const id = newId('i-');
  if (file.type.startsWith('image/')) {
    let natural = { width: 400, height: 300 };
    try {
      natural = await imageSize(file);
    } catch {
      // Keep a default size; the browser may still show it.
    }
    const width = Math.min(400, natural.width, pw - 80);
    const height = Math.round((natural.height * width) / natural.width);
    const item: ImageItem = {
      id,
      kind: 'image',
      fileId,
      x: Math.round((pw - width) / 2),
      y: Math.round(Math.max(40, (ph - height) / 3)),
      width,
      height,
    };
    noteStore.editItems(pageId, (items) => [...items, item]);
  } else {
    const item: FileItem = {
      id,
      kind: 'file',
      fileId,
      name: file.name,
      x: Math.round((pw - 240) / 2),
      y: Math.round(ph / 3),
    };
    noteStore.editItems(pageId, (items) => [...items, item]);
  }
  return id;
}

export async function openStoredFile(fileId: string): Promise<boolean> {
  const f = await db.getFile(fileId);
  if (!f) return false;
  const url = URL.createObjectURL(f.blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  if (!f.type.startsWith('image/') && f.type !== 'application/pdf') a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
