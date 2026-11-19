import type { NoteDocument } from '../types/note';
import { displayTitle } from './documents';

/** Lowercase and strip Vietnamese diacritics so "ghi chu" matches "Ghi chú". */
export function foldText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Every whitespace-separated term must appear in the title, body or tags.
 * A term starting with '#' only matches tags.
 */
export function matchesQuery(doc: NoteDocument, query: string): boolean {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const tags = doc.tags.map(foldText);
  const body = foldText(
    [displayTitle(doc), doc.kind === 'note' ? doc.plainText : '', doc.tags.join(' ')].join('\n'),
  );
  return terms.every((raw) => {
    if (raw.startsWith('#')) {
      const t = foldText(raw.slice(1));
      return t === '' || tags.some((tag) => tag.includes(t));
    }
    return body.includes(foldText(raw));
  });
}
