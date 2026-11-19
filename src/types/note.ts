/** Domain types for OLAA Note. Pure data — no DOM or storage concerns. */

export type DocumentKind = 'note' | 'notebook';

export type PaperStyle = 'blank' | 'lined' | 'grid' | 'dotted';

export type InkTool = 'pen' | 'highlighter';

/** [x, y, pressure] in page coordinates (PAGE_WIDTH × PAGE_HEIGHT space). */
export type InkPoint = [number, number, number];

export interface Stroke {
  id: string;
  tool: InkTool;
  color: string;
  width: number;
  points: InkPoint[];
}

export interface PlacedImage {
  id: string;
  /** data: URL of the image. */
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Page {
  id: string;
  strokes: Stroke[];
  images: PlacedImage[];
}

interface DocumentBase {
  id: string;
  kind: DocumentKind;
  title: string;
  tags: string[];
  pinned: boolean;
  /** ISO timestamp — set when moved to trash; undefined when active. */
  trashedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Rich-text note (Apple Notes style). */
export interface TextNote extends DocumentBase {
  kind: 'note';
  /** Sanitised HTML body produced by the rich-text editor. */
  html: string;
  /** Plain-text projection of `html`, kept for search and previews. */
  plainText: string;
}

/** Paged handwriting notebook (GoodNotes style). */
export interface Notebook extends DocumentBase {
  kind: 'notebook';
  cover: string;
  paper: PaperStyle;
  pages: Page[];
}

export type NoteDocument = TextNote | Notebook;

/** Logical page size; canvases scale this to the viewport. ~A4 ratio. */
export const PAGE_WIDTH = 820;
export const PAGE_HEIGHT = 1160;
