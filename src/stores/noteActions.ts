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

// ---------- PRD v1.0 §8.2: favorites, archive, tags, move ----------

export function setFavorite(
  state: NoteState,
  id: string,
  favorite: boolean,
  now: number,
): NoteState {
  return patchNotebook(state, id, { favorite }, now);
}

export function setArchived(
  state: NoteState,
  id: string,
  archived: boolean,
  now: number,
): NoteState {
  return patchNotebook(state, id, { archivedAt: archived ? now : null }, now);
}

export const MAX_TAG_LENGTH = 32;
export const MAX_TAGS_PER_PAGE = 12;

export function cleanTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH);
}

function sameTag(a: string, b: string): boolean {
  return a.localeCompare(b, 'vi', { sensitivity: 'accent' }) === 0;
}

export function addPageTag(state: NoteState, pageId: string, raw: string, now: number): NoteState {
  const page = state.pages[pageId];
  const tag = cleanTag(raw);
  const tags = page?.tags ?? [];
  if (!page || !tag || tags.length >= MAX_TAGS_PER_PAGE || tags.some((t) => sameTag(t, tag)))
    return state;
  return patchPage(state, pageId, { tags: [...tags, tag] }, now);
}

export function removePageTag(
  state: NoteState,
  pageId: string,
  tag: string,
  now: number,
): NoteState {
  const page = state.pages[pageId];
  if (!page?.tags?.includes(tag)) return state;
  return patchPage(state, pageId, { tags: page.tags.filter((t) => t !== tag) }, now);
}

/** All tags with how many pages use each, for filters. */
export function allTags(state: NoteState): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const page of Object.values(state.pages)) {
    const nb = state.notebooks[page.notebookId];
    if (!nb || nb.deletedAt !== null) continue;
    for (const t of page.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, 'vi'));
}

/** Rename a tag everywhere; renaming onto an existing tag merges the two (PRD v1.0 §8.2). */
export function renameTag(state: NoteState, from: string, to: string, now: number): NoteState {
  const target = cleanTag(to);
  if (!target || from === target) return state;
  let next = state;
  for (const page of Object.values(state.pages)) {
    if (!page.tags?.includes(from)) continue;
    const without = page.tags.filter((t) => t !== from);
    const tags = without.some((t) => sameTag(t, target)) ? without : [...without, target];
    next = patchPage(next, page.id, { tags }, now);
  }
  return next;
}

/** Move a page to the end of another notebook. The source keeps at least one page. */
export function movePageToNotebook(
  state: NoteState,
  pageId: string,
  targetId: string,
  now: number,
): NoteState {
  const page = state.pages[pageId];
  const from = page && state.notebooks[page.notebookId];
  const to = state.notebooks[targetId];
  if (!page || !from || !to || from.id === to.id || from.pageIds.length <= 1) return state;
  return {
    ...state,
    pages: { ...state.pages, [pageId]: { ...page, notebookId: to.id, updatedAt: now } },
    notebooks: {
      ...state.notebooks,
      [from.id]: { ...from, pageIds: from.pageIds.filter((id) => id !== pageId), updatedAt: now },
      [to.id]: { ...to, pageIds: [...to.pageIds, pageId], updatedAt: now },
    },
  };
}
