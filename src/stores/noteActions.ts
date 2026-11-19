/** Pure state changes for notebooks and pages (modules 03.01, 03.07). */
import type { Item } from '../features/digital-canvas/items';
import {
  cleanTitle,
  isExpired,
  type Notebook,
  type NotebookColor,
} from '../features/notebook-management/types';
import type { Page, PageBackground, PageTemplate } from '../features/page-management/types';

export interface NoteState {
  ready: boolean;
  notebooks: Record<string, Notebook>;
  pages: Record<string, Page>;
}

export function emptyState(): NoteState {
  return { ready: false, notebooks: {}, pages: {} };
}

export function newPage(
  id: string,
  notebookId: string,
  template: PageTemplate,
  now: number,
  background: PageBackground = { kind: 'template' },
): Page {
  return { id, notebookId, template, background, items: [], updatedAt: now };
}

export function createNotebook(
  state: NoteState,
  input: {
    id: string;
    title: string;
    color: NotebookColor;
    template: PageTemplate;
    firstPageId: string;
  },
  now: number,
): NoteState {
  const notebook: Notebook = {
    id: input.id,
    title: cleanTitle(input.title),
    color: input.color,
    createdAt: now,
    updatedAt: now,
    pageIds: [input.firstPageId],
    deletedAt: null,
  };
  return {
    ...state,
    notebooks: { ...state.notebooks, [notebook.id]: notebook },
    pages: {
      ...state.pages,
      [input.firstPageId]: newPage(input.firstPageId, notebook.id, input.template, now),
    },
  };
}

function patchNotebook(
  state: NoteState,
  id: string,
  patch: Partial<Notebook>,
  now: number,
): NoteState {
  const nb = state.notebooks[id];
  if (!nb) return state;
  return { ...state, notebooks: { ...state.notebooks, [id]: { ...nb, ...patch, updatedAt: now } } };
}

export function updateNotebook(
  state: NoteState,
  id: string,
  patch: { title?: string; color?: NotebookColor },
  now: number,
): NoteState {
  return patchNotebook(
    state,
    id,
    { ...patch, ...(patch.title !== undefined ? { title: cleanTitle(patch.title) } : {}) },
    now,
  );
}

export function trashNotebook(state: NoteState, id: string, now: number): NoteState {
  return patchNotebook(state, id, { deletedAt: now }, now);
}

export function restoreNotebook(state: NoteState, id: string, now: number): NoteState {
  return patchNotebook(state, id, { deletedAt: null }, now);
}

export function deleteNotebookForever(state: NoteState, id: string): NoteState {
  const nb = state.notebooks[id];
  if (!nb) return state;
  const notebooks = { ...state.notebooks };
  delete notebooks[id];
  const pages = { ...state.pages };
  for (const pid of nb.pageIds) delete pages[pid];
  return { ...state, notebooks, pages };
}

/** Remove notebooks that have been in the trash longer than TRASH_DAYS. */
export function purgeExpired(state: NoteState, now: number): NoteState {
  let next = state;
  for (const nb of Object.values(state.notebooks)) {
    if (isExpired(nb, now)) next = deleteNotebookForever(next, nb.id);
  }
  return next;
}

export function addPage(
  state: NoteState,
  notebookId: string,
  index: number,
  page: Page,
  now: number,
): NoteState {
  const nb = state.notebooks[notebookId];
  if (!nb) return state;
  const pageIds = [...nb.pageIds];
  pageIds.splice(Math.max(0, Math.min(index, pageIds.length)), 0, page.id);
  return {
    ...state,
    notebooks: { ...state.notebooks, [notebookId]: { ...nb, pageIds, updatedAt: now } },
    pages: { ...state.pages, [page.id]: page },
  };
}

/** Delete a page. A notebook always keeps at least one page. */
export function removePage(
  state: NoteState,
  notebookId: string,
  pageId: string,
  now: number,
): NoteState {
  const nb = state.notebooks[notebookId];
  if (!nb || nb.pageIds.length <= 1 || !nb.pageIds.includes(pageId)) return state;
  const pages = { ...state.pages };
  delete pages[pageId];
  return {
    ...state,
    notebooks: {
      ...state.notebooks,
      [notebookId]: { ...nb, pageIds: nb.pageIds.filter((p) => p !== pageId), updatedAt: now },
    },
    pages,
  };
}

export function duplicatePage(
  state: NoteState,
  notebookId: string,
  pageId: string,
  copyId: string,
  now: number,
): NoteState {
  const nb = state.notebooks[notebookId];
  const page = state.pages[pageId];
  if (!nb || !page) return state;
  const copy: Page = {
    ...page,
    id: copyId,
    items: page.items.map((it) => ({ ...it, id: `${it.id}-c${now}` })),
    updatedAt: now,
  };
  return addPage(state, notebookId, nb.pageIds.indexOf(pageId) + 1, copy, now);
}

export function movePage(
  state: NoteState,
  notebookId: string,
  from: number,
  to: number,
  now: number,
): NoteState {
  const nb = state.notebooks[notebookId];
  if (
    !nb ||
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= nb.pageIds.length ||
    to >= nb.pageIds.length
  ) {
    return state;
  }
  const pageIds = [...nb.pageIds];
  const [moved] = pageIds.splice(from, 1);
  pageIds.splice(to, 0, moved!);
  return {
    ...state,
    notebooks: { ...state.notebooks, [notebookId]: { ...nb, pageIds, updatedAt: now } },
  };
}

function patchPage(state: NoteState, pageId: string, patch: Partial<Page>, now: number): NoteState {
  const page = state.pages[pageId];
  if (!page) return state;
  const nb = state.notebooks[page.notebookId];
  return {
    ...state,
    pages: { ...state.pages, [pageId]: { ...page, ...patch, updatedAt: now } },
    notebooks: nb ? { ...state.notebooks, [nb.id]: { ...nb, updatedAt: now } } : state.notebooks,
  };
}

export function setPageItems(
  state: NoteState,
  pageId: string,
  items: Item[],
  now: number,
): NoteState {
  const page = state.pages[pageId];
  if (!page || page.items === items) return state;
  return patchPage(state, pageId, { items }, now);
}

export function setPageTemplate(
  state: NoteState,
  pageId: string,
  template: PageTemplate,
  now: number,
): NoteState {
  return patchPage(state, pageId, { template }, now);
}

/** File ids a page uses: its imported background and any images or attachments. */
export function filesOfPage(page: Page): string[] {
  const ids = page.items.flatMap((it) =>
    it.kind === 'image' || it.kind === 'file' ? [it.fileId] : [],
  );
  if (page.background.kind === 'image') ids.push(page.background.fileId);
  return ids;
}

/** Files used by `removed` pages that no remaining page still uses. */
export function orphanedFiles(removed: Page[], remaining: NoteState): string[] {
  const inUse = new Set(Object.values(remaining.pages).flatMap(filesOfPage));
  return [...new Set(removed.flatMap(filesOfPage))].filter((id) => !inUse.has(id));
}
