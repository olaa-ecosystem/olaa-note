import { describe, expect, it } from 'vitest';
import { foldText, matchesQuery } from '../../src/utils/search';
import { createNotebook, createTextNote } from '../../src/utils/documents';

describe('foldText', () => {
  it('removes Vietnamese diacritics and lowercases', () => {
    expect(foldText('Ghi Chú Đẹp')).toBe('ghi chu dep');
  });
});

describe('matchesQuery', () => {
  const note = createTextNote({ title: 'Họp dự án', plainText: 'Chuẩn bị báo cáo quý', tags: ['công-việc'] });

  it('matches everything for an empty query', () => {
    expect(matchesQuery(note, '   ')).toBe(true);
  });
  it('matches accent-insensitively across title and body', () => {
    expect(matchesQuery(note, 'hop bao cao')).toBe(true);
  });
  it('requires all terms', () => {
    expect(matchesQuery(note, 'hop toan')).toBe(false);
  });
  it('treats #term as a tag filter', () => {
    expect(matchesQuery(note, '#cong')).toBe(true);
    expect(matchesQuery(note, '#bao')).toBe(false);
  });
  it('matches notebooks by title', () => {
    expect(matchesQuery(createNotebook({ title: 'Toán 12' }), 'toan')).toBe(true);
  });
});
