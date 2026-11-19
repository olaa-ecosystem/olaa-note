import type { Stroke } from '../features/digital-canvas/items';
import {
  addPage,
  createNotebook,
  deleteNotebookForever,
  duplicatePage,
  emptyState,
  movePage,
  newPage,
  orphanedFiles,
  purgeExpired,
  removePage,
  restoreNotebook,
  setPageItems,
  trashNotebook,
} from './noteActions';

const now = 1_000_000;
const DAY = 86_400_000;
const base = createNotebook(
  emptyState(),
  { id: 'n', title: '  Toán  ', color: 'blue', template: 'lined', firstPageId: 'p1' },
  now,
);

describe('notebooks', () => {
  it('creates a notebook with one page and a clean title', () => {
    expect(base.notebooks.n?.title).toBe('Toán');
    expect(base.notebooks.n?.pageIds).toEqual(['p1']);
    expect(base.pages.p1?.template).toBe('lined');
    const untitled = createNotebook(
      emptyState(),
      { id: 'x', title: ' ', color: 'red', template: 'blank', firstPageId: 'y' },
      now,
    );
    expect(untitled.notebooks.x?.title).toBe('Sổ tay chưa đặt tên');
  });

  it('keeps trashed notebooks for 30 days, then purges them with their pages', () => {
    const trashed = trashNotebook(base, 'n', now);
    expect(purgeExpired(trashed, now + 29 * DAY)).toBe(trashed);
    const purged = purgeExpired(trashed, now + 31 * DAY);
    expect(purged.notebooks.n).toBeUndefined();
    expect(purged.pages.p1).toBeUndefined();
    expect(restoreNotebook(trashed, 'n', now).notebooks.n?.deletedAt).toBeNull();
    expect(deleteNotebookForever(base, 'n').pages).toEqual({});
  });
});

describe('pages', () => {
  it('adds, moves, duplicates and removes pages but never the last one', () => {
    let s = addPage(base, 'n', 1, newPage('p2', 'n', 'grid', now), now);
    s = addPage(s, 'n', 0, newPage('p0', 'n', 'dots', now), now);
    expect(s.notebooks.n?.pageIds).toEqual(['p0', 'p1', 'p2']);
    s = movePage(s, 'n', 0, 2, now);
    expect(s.notebooks.n?.pageIds).toEqual(['p1', 'p2', 'p0']);
    s = duplicatePage(s, 'n', 'p2', 'p2b', now);
    expect(s.notebooks.n?.pageIds).toEqual(['p1', 'p2', 'p2b', 'p0']);
    s = removePage(s, 'n', 'p2', now);
    expect(s.pages.p2).toBeUndefined();
    const single = removePage(base, 'n', 'p1', now);
    expect(single).toBe(base);
  });

  it('finds files no longer used after a page is removed', () => {
    let s = addPage(
      base,
      'n',
      1,
      { ...newPage('p2', 'n', 'blank', now, { kind: 'image', fileId: 'pdf1' }) },
      now,
    );
    s = setPageItems(
      s,
      'p1',
      [{ id: 'i', kind: 'image', fileId: 'img', x: 0, y: 0, width: 10, height: 10 }],
      now,
    );
    s = setPageItems(
      s,
      'p2',
      [{ id: 'j', kind: 'image', fileId: 'img', x: 0, y: 0, width: 10, height: 10 }],
      now,
    );
    const removed = s.pages.p2!;
    const after = removePage(s, 'n', 'p2', now);
    expect(orphanedFiles([removed], after)).toEqual(['pdf1']);
  });
});

describe('strokes', () => {
  it('keeps item identity when nothing changes', () => {
    const stroke: Stroke = {
      id: 's',
      kind: 'stroke',
      tool: 'pen',
      color: '#000',
      width: 2,
      points: [[0, 0, 0.5]],
    };
    const s = setPageItems(base, 'p1', [stroke], now);
    expect(setPageItems(s, 'p1', s.pages.p1!.items, now)).toBe(s);
  });
});
