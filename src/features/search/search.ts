/**
 * Search (Ecosystem PRD v1.0 §8.2, module 03.11): notebook titles, typed text, attachment
 * names and tags, with filters by tag and notebook. Handwriting and PDF text are not indexed
 * yet (OCR is P2); results say so.
 */
import type { NoteState } from '../../stores/noteActions';
import { plainText } from '../rich-text-editor/richText';

export interface SearchHit {
  notebookId: string;
  pageId: string;
  /** 1-based page number in its notebook. */
  page: number;
  /** Where the match is: 'title' | 'text' | 'file' | 'tag'. */
  field: 'title' | 'text' | 'file' | 'tag';
  snippet: string;
  /** [start, end) of the match inside `snippet`, for highlighting. */
  match: [number, number] | null;
  tags: string[];
}

/** Lower-case and strip Vietnamese accents so "tieng anh" finds "Tiếng Anh". */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function snippetAround(
  text: string,
  start: number,
  length: number,
): { snippet: string; match: [number, number] } {
  const from = Math.max(0, start - 40);
  const to = Math.min(text.length, start + length + 60);
  const prefix = from > 0 ? '…' : '';
  const suffix = to < text.length ? '…' : '';
  return {
    snippet: prefix + text.slice(from, to) + suffix,
    match: [prefix.length + start - from, prefix.length + start - from + length],
  };
}

export interface SearchOptions {
  tag?: string | null;
  notebookId?: string | null;
  includeArchived?: boolean;
  limit?: number;
}

export function search(state: NoteState, query: string, opts: SearchOptions = {}): SearchHit[] {
  const q = fold(query.trim());
  const hits: SearchHit[] = [];
  const limit = opts.limit ?? 100;
  for (const nb of Object.values(state.notebooks)) {
    if (nb.deletedAt !== null) continue;
    if (nb.archivedAt && !opts.includeArchived) continue;
    if (opts.notebookId && nb.id !== opts.notebookId) continue;
    nb.pageIds.forEach((pageId, i) => {
      const page = state.pages[pageId];
      if (!page || hits.length >= limit) return;
      const tags = page.tags ?? [];
      if (opts.tag && !tags.includes(opts.tag)) return;
      const base = { notebookId: nb.id, pageId, page: i + 1, tags };
      if (!q) {
        hits.push({
          ...base,
          field: 'tag',
          snippet: firstText(page.items) || nb.title,
          match: null,
        });
        return;
      }
      const titleAt = fold(nb.title).indexOf(q);
      if (titleAt >= 0 && i === 0) {
        hits.push({
          ...base,
          field: 'title',
          snippet: nb.title,
          match: [titleAt, titleAt + q.length],
        });
        return;
      }
      for (const item of page.items) {
        const text =
          item.kind === 'text' ? plainText(item.html) : item.kind === 'file' ? item.name : '';
        const at = fold(text).indexOf(q);
        if (at >= 0) {
          hits.push({
            ...base,
            field: item.kind === 'file' ? 'file' : 'text',
            ...snippetAround(text, at, q.length),
          });
          return;
        }
      }
      const tag = tags.find((t) => fold(t).includes(q));
      if (tag) hits.push({ ...base, field: 'tag', snippet: `#${tag}`, match: null });
    });
  }
  return hits;
}

function firstText(items: NoteState['pages'][string]['items']): string {
  for (const it of items) if (it.kind === 'text') return plainText(it.html).slice(0, 120);
  return '';
}
