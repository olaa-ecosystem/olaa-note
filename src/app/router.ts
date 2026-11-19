import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'library' }
  | { name: 'trash' }
  | { name: 'notebook'; notebookId: string; page: number };

/** Tiny hash router: works on any static host with no server rewrites. `page` is 1-based. */
export function parseRoute(hash: string): Route {
  const [head, id, page] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (head === 'trash') return { name: 'trash' };
  if (head === 'nb' && id) {
    const n = Number(page);
    return {
      name: 'notebook',
      notebookId: decodeURIComponent(id),
      page: Number.isInteger(n) && n >= 1 ? n : 1,
    };
  }
  return { name: 'library' };
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case 'library':
      return '#/';
    case 'trash':
      return '#/trash';
    case 'notebook':
      return `#/nb/${encodeURIComponent(route.notebookId)}/${route.page}`;
  }
}

export function navigate(route: Route, replace = false): void {
  const href = routeHref(route);
  if (replace) {
    window.history.replaceState(null, '', href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = href;
  }
}

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

export function useHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
}
