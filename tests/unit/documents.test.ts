import { describe, expect, it } from 'vitest';
import {
  allTags,
  createTextNote,
  displayTitle,
  htmlToPlainText,
  normalizeTag,
  sortDocuments,
} from '../../src/utils/documents';

describe('documents utils', () => {
  it('derives a title from the first text line when untitled', () => {
    expect(displayTitle(createTextNote({ plainText: '\n  Mua sữa \nTrứng' }))).toBe('Mua sữa');
    expect(displayTitle(createTextNote())).toBe('Ghi chú mới');
  });

  it('normalises tags', () => {
    expect(normalizeTag('  ##Công Việc  ')).toBe('công-việc');
  });

  it('collects tags from non-trashed docs only', () => {
    const docs = [
      createTextNote({ tags: ['b', 'a'] }),
      createTextNote({ tags: ['z'], trashedAt: '2026-01-01T00:00:00.000Z' }),
    ];
    expect(allTags(docs)).toEqual(['a', 'b']);
  });

  it('sorts pinned first then by updatedAt desc', () => {
    const a = createTextNote({ updatedAt: '2026-01-01T00:00:00.000Z' });
    const b = createTextNote({ updatedAt: '2026-03-01T00:00:00.000Z' });
    const c = createTextNote({ updatedAt: '2025-01-01T00:00:00.000Z', pinned: true });
    expect(sortDocuments([a, b, c]).map((d) => d.id)).toEqual([c.id, b.id, a.id]);
  });

  it('converts html to plain text', () => {
    expect(htmlToPlainText('<h1>Tiêu đề</h1><p>A &amp; B</p><ul><li>x</li></ul>')).toBe('Tiêu đề\nA & B\nx');
  });
});
