import type { Item } from '../digital-canvas/items';

/** Page paper (REQ-03-003). */
export type PageTemplate = 'blank' | 'lined' | 'grid' | 'dots';

export const PAGE_TEMPLATES: { id: PageTemplate; label: string }[] = [
  { id: 'blank', label: 'Trắng' },
  { id: 'lined', label: 'Kẻ dòng' },
  { id: 'grid', label: 'Ô vuông' },
  { id: 'dots', label: 'Chấm' },
];

/** A4 portrait in page units (CSS px at 96 dpi). Every page uses this coordinate space. */
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;

/** Background drawn under the user's content: the paper, or an imported PDF page image. */
export type PageBackground = { kind: 'template' } | { kind: 'image'; fileId: string };

/** One page (module 03.07). Its content lives in `items` (module 03.04). */
export interface Page {
  id: string;
  notebookId: string;
  /** Page size in page units. Missing means A4 portrait; imported PDF pages keep their shape. */
  size?: { width: number; height: number };
  template: PageTemplate;
  background: PageBackground;
  items: Item[];
  updatedAt: number;
}

export function pageSize(page: Pick<Page, 'size'>): { width: number; height: number } {
  return page.size ?? { width: PAGE_WIDTH, height: PAGE_HEIGHT };
}
