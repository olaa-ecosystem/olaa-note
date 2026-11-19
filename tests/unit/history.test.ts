import { describe, expect, it } from 'vitest';
import { PageHistory } from '../../src/features/notebook/history';
import type { Page } from '../../src/types/note';

const page = (n: number): Page => ({
  id: 'p',
  strokes: Array.from({ length: n }, (_, i) => ({
    id: String(i),
    tool: 'pen' as const,
    color: '#000',
    width: 1,
    points: [],
  })),
  images: [],
});

describe('PageHistory', () => {
  it('undoes and redoes snapshots', () => {
    const h = new PageHistory();
    const p0 = page(0);
    const p1 = page(1);
    h.record(p0);
    expect(h.canUndo('p')).toBe(true);
    expect(h.undo(p1)).toBe(p0);
    expect(h.canRedo('p')).toBe(true);
    expect(h.redo(p0)).toBe(p1);
  });

  it('clears redo on a new change', () => {
    const h = new PageHistory();
    h.record(page(0));
    h.undo(page(1));
    h.record(page(0));
    expect(h.canRedo('p')).toBe(false);
  });
});
