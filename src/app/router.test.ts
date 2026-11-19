import { parseRoute, routeHref } from './router';

describe('router', () => {
  it('round-trips routes', () => {
    for (const r of [
      { name: 'library' },
      { name: 'trash' },
      { name: 'archive' },
      { name: 'search', query: 'tiếng anh', tag: null },
      { name: 'search', query: '', tag: 'từ vựng' },
      { name: 'search', query: '', tag: null },
      { name: 'notebook', notebookId: 'a b', page: 3 },
    ] as const) {
      expect(parseRoute(routeHref(r))).toEqual(r);
    }
  });
  it('defaults the page and falls back to the library', () => {
    expect(parseRoute('#/nb/x')).toEqual({ name: 'notebook', notebookId: 'x', page: 1 });
    expect(parseRoute('#/nb/x/zero')).toEqual({ name: 'notebook', notebookId: 'x', page: 1 });
    expect(parseRoute('#/what')).toEqual({ name: 'library' });
  });
});
