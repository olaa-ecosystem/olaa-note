import type { Notebook, NoteDocument, Page, PaperStyle, TextNote } from '../types/note';
import { createId, nowIso } from './id';

export const COVER_COLORS = ['#e8a33d', '#d9634c', '#4f8a6e', '#3f6fb5', '#7a5bb5', '#3b3b3b', '#c4746f', '#5aa3a8'];

export function createPage(): Page {
  return { id: createId(), strokes: [], images: [] };
}

export function createTextNote(partial: Partial<TextNote> = {}): TextNote {
  const t = nowIso();
  return {
    id: createId(),
    kind: 'note',
    title: '',
    html: '',
    plainText: '',
    tags: [],
    pinned: false,
    createdAt: t,
    updatedAt: t,
    ...partial,
  };
}

export function createNotebook(
  partial: Partial<Omit<Notebook, 'kind'>> & { paper?: PaperStyle } = {},
): Notebook {
  const t = nowIso();
  return {
    id: createId(),
    kind: 'notebook',
    title: 'Sổ tay mới',
    cover: COVER_COLORS[0],
    paper: 'lined',
    pages: [createPage()],
    tags: [],
    pinned: false,
    createdAt: t,
    updatedAt: t,
    ...partial,
  };
}

/** Display title: falls back to the first line of a note's text. */
export function displayTitle(doc: NoteDocument): string {
  if (doc.title.trim()) return doc.title.trim();
  if (doc.kind === 'note') {
    const firstLine = doc.plainText.split('\n').find((l) => l.trim());
    if (firstLine) return firstLine.trim().slice(0, 80);
    return 'Ghi chú mới';
  }
  return 'Sổ tay không tên';
}

export function previewText(doc: NoteDocument): string {
  if (doc.kind === 'notebook') {
    return `${doc.pages.length} trang`;
  }
  const lines = doc.plainText.split('\n').map((l) => l.trim()).filter(Boolean);
  // Skip the line already used as title.
  const rest = doc.title.trim() ? lines : lines.slice(1);
  return rest.join(' ').slice(0, 140) || 'Không có nội dung bổ sung';
}

/** Normalise a user-entered tag: trim, drop leading '#', lowercase, collapse spaces. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase();
}

export function allTags(docs: NoteDocument[]): string[] {
  const set = new Set<string>();
  for (const d of docs) if (!d.trashedAt) d.tags.forEach((t) => set.add(t));
  return [...set].sort((a, b) => a.localeCompare(b, 'vi'));
}

/** Sort: pinned first, then most recently updated. */
export function sortDocuments(docs: NoteDocument[]): NoteDocument[] {
  return [...docs].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/** Strip HTML to plain text without touching the DOM (safe in workers/tests). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
