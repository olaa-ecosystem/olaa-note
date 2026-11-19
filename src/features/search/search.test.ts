import {
  addPage,
  addPageTag,
  allTags,
  createNotebook,
  emptyState,
  movePageToNotebook,
  newPage,
  removePageTag,
  renameTag,
  setArchived,
  setFavorite,
  setPageItems,
} from '../../stores/noteActions';
import { fold, search } from './search';

const now = 1;
function build() {
  let s = createNotebook(
    emptyState(),
    { id: 'en', title: 'Tiếng Anh — Unit 3', color: 'blue', template: 'lined', firstPageId: 'p1' },
    now,
  );
  s = createNotebook(
    s,
    { id: 'math', title: 'Toán', color: 'red', template: 'grid', firstPageId: 'm1' },
    now,
  );
  s = addPage(s, 'en', 1, newPage('p2', 'en', 'lined', now), now);
  s = setPageItems(
    s,
    'p2',
    [
      {
        id: 't',
        kind: 'text',
        x: 0,
        y: 0,
        width: 200,
        html: '<p>apple: <b>quả táo</b></p><ul data-checklist><li>học thuộc</li></ul>',
      },
    ],
    now,
  );
  s = setPageItems(
    s,
    'm1',
    [{ id: 'f', kind: 'file', fileId: 'x', name: 'De cuong hinh hoc.pdf', x: 0, y: 0 }],
    now,
  );
  return s;
}

describe('search', () => {
  it('folds Vietnamese accents', () => {
    expect(fold('Tiếng Đức')).toBe('tieng duc');
  });

  it('finds titles, typed text and file names, accent-insensitively, with a match range', () => {
    const s = build();
    expect(search(s, 'tieng anh').map((h) => [h.pageId, h.field])).toEqual([['p1', 'title']]);
    const [text] = search(s, 'qua tao');
    expect(text).toMatchObject({ pageId: 'p2', page: 2, field: 'text' });
    expect(text!.snippet.slice(...text!.match!)).toBe('quả táo');
    expect(search(s, 'hinh hoc')[0]).toMatchObject({ pageId: 'm1', field: 'file' });
    expect(search(s, 'không có')).toEqual([]);
  });

  it('filters by tag and hides archived notebooks unless asked', () => {
    let s = addPageTag(build(), 'p2', '#Từ vựng', now);
    expect(search(s, '', { tag: 'Từ vựng' }).map((h) => h.pageId)).toEqual(['p2']);
    s = setArchived(s, 'en', true, now);
    expect(search(s, 'qua tao')).toEqual([]);
    expect(search(s, 'qua tao', { includeArchived: true })).toHaveLength(1);
  });
});

describe('tags', () => {
  it('adds clean unique tags, removes them, and counts usage', () => {
    let s = addPageTag(build(), 'p1', '  #Từ   vựng ', now);
    s = addPageTag(s, 'p1', 'từ vựng', now); // same tag, other case/accents kept → duplicate ignored
    s = addPageTag(s, 'p2', 'Từ vựng', now);
    expect(s.pages.p1?.tags).toEqual(['Từ vựng']);
    expect(allTags(s)).toEqual([{ tag: 'Từ vựng', count: 2 }]);
    s = removePageTag(s, 'p1', 'Từ vựng', now);
    expect(s.pages.p1?.tags).toEqual([]);
  });

  it('renames everywhere, and renaming onto an existing tag merges', () => {
    let s = addPageTag(build(), 'p1', 'vocab', now);
    s = addPageTag(s, 'p1', 'từ vựng', now);
    s = addPageTag(s, 'p2', 'vocab', now);
    s = renameTag(s, 'vocab', 'từ vựng', now);
    expect(s.pages.p1?.tags).toEqual(['từ vựng']);
    expect(s.pages.p2?.tags).toEqual(['từ vựng']);
  });
});

describe('notebook organisation', () => {
  it('favorites and archives notebooks', () => {
    let s = setFavorite(build(), 'math', true, now);
    expect(s.notebooks.math?.favorite).toBe(true);
    s = setArchived(s, 'math', true, 5);
    expect(s.notebooks.math?.archivedAt).toBe(5);
    expect(setArchived(s, 'math', false, 6).notebooks.math?.archivedAt).toBeNull();
  });

  it('moves a page to another notebook, never emptying the source', () => {
    const s = movePageToNotebook(build(), 'p2', 'math', now);
    expect(s.notebooks.en?.pageIds).toEqual(['p1']);
    expect(s.notebooks.math?.pageIds).toEqual(['m1', 'p2']);
    expect(s.pages.p2?.notebookId).toBe('math');
    expect(movePageToNotebook(s, 'p1', 'math', now)).toBe(s);
  });
});
