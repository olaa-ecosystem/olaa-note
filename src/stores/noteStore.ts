/**
 * App store: notebooks and pages in memory, written to IndexedDB after every change
 * (notebooks at once, pages within PAGE_SAVE_DELAY_MS, NFR-03-002), plus per-page undo history.
 */
import { useSyncExternalStore } from 'react';
import type { Item } from '../features/digital-canvas/items';
import {
  emptyHistory,
  record,
  redo,
  undo,
  type History,
} from '../features/history-recovery/history';
import { db } from '../services/db';
import {
  emptyState,
  orphanedFiles,
  purgeExpired,
  setPageItems,
  type NoteState,
} from './noteActions';

export const PAGE_SAVE_DELAY_MS = 300;

let state: NoteState = emptyState();
let histories: Record<string, History> = {};
const listeners = new Set<() => void>();
const pendingPages = new Map<string, ReturnType<typeof setTimeout>>();
let saveError: string | null = null;

function emit(): void {
  listeners.forEach((l) => l());
}

function reportSaveError(): void {
  saveError = 'Chưa lưu được vào máy. Kiểm tra dung lượng trống của trình duyệt.';
  emit();
}

function savePage(id: string): void {
  pendingPages.delete(id);
  const page = state.pages[id];
  (page ? db.putPage(page) : db.deletePage(id)).catch(reportSaveError);
}

/** Write what changed between two states. */
function persist(prev: NoteState, next: NoteState): void {
  for (const [id, nb] of Object.entries(next.notebooks)) {
    if (prev.notebooks[id] !== nb) db.putNotebook(nb).catch(reportSaveError);
  }
  for (const id of Object.keys(prev.notebooks)) {
    if (!next.notebooks[id]) db.deleteNotebook(id).catch(reportSaveError);
  }
  for (const [id, page] of Object.entries(next.pages)) {
    if (prev.pages[id] !== page) {
      const timer = pendingPages.get(id);
      if (timer) clearTimeout(timer);
      pendingPages.set(
        id,
        setTimeout(() => savePage(id), PAGE_SAVE_DELAY_MS),
      );
    }
  }
  const removed = Object.keys(prev.pages).filter((id) => !next.pages[id]);
  for (const id of removed) {
    const timer = pendingPages.get(id);
    if (timer) clearTimeout(timer);
    pendingPages.delete(id);
    db.deletePage(id).catch(reportSaveError);
  }
  if (removed.length > 0) {
    const gone = removed.map((id) => prev.pages[id]!).filter(Boolean);
    for (const fileId of orphanedFiles(gone, next)) db.deleteFile(fileId).catch(() => {});
  }
}

export const noteStore = {
  getState: (): NoteState => state,

  update(updater: (current: NoteState) => NoteState): void {
    const next = updater(state);
    if (next === state) return;
    const prev = state;
    state = next;
    persist(prev, next);
    emit();
  },

  /** Change a page's items as one undoable step. */
  editItems(pageId: string, change: (items: Item[]) => Item[]): void {
    const page = state.pages[pageId];
    if (!page) return;
    const items = change(page.items);
    if (items === page.items) return;
    histories = { ...histories, [pageId]: record(histories[pageId] ?? emptyHistory(), page.items) };
    noteStore.update((s) => setPageItems(s, pageId, items, Date.now()));
  },

  undo(pageId: string): void {
    const page = state.pages[pageId];
    const result = page && undo(histories[pageId] ?? emptyHistory(), page.items);
    if (!result) return;
    histories = { ...histories, [pageId]: result.history };
    noteStore.update((s) => setPageItems(s, pageId, result.items, Date.now()));
  },

  redo(pageId: string): void {
    const page = state.pages[pageId];
    const result = page && redo(histories[pageId] ?? emptyHistory(), page.items);
    if (!result) return;
    histories = { ...histories, [pageId]: result.history };
    noteStore.update((s) => setPageItems(s, pageId, result.items, Date.now()));
  },

  canUndo: (pageId: string) => (histories[pageId]?.past.length ?? 0) > 0,
  canRedo: (pageId: string) => (histories[pageId]?.future.length ?? 0) > 0,
  saveError: () => saveError,

  /** Write every pending page now (on tab hide / close). */
  flush(): void {
    for (const [id, timer] of pendingPages) {
      clearTimeout(timer);
      savePage(id);
    }
  },

  async load(): Promise<void> {
    try {
      const [notebooks, pages] = await Promise.all([db.allNotebooks(), db.allPages()]);
      const loaded: NoteState = {
        ready: true,
        notebooks: Object.fromEntries(notebooks.map((n) => [n.id, n])),
        pages: Object.fromEntries(pages.map((p) => [p.id, p])),
      };
      const purged = purgeExpired(loaded, Date.now());
      state = loaded;
      if (purged !== loaded) noteStore.update(() => purged);
    } catch {
      state = { ...emptyState(), ready: true };
      saveError = 'Trình duyệt này không cho lưu dữ liệu (có thể đang ở chế độ ẩn danh).';
    }
    emit();
  },

  /** For tests. */
  resetForTests(next: NoteState = { ...emptyState(), ready: true }): void {
    pendingPages.forEach((t) => clearTimeout(t));
    pendingPages.clear();
    state = next;
    histories = {};
    saveError = null;
    emit();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

let version = 0;
noteStore.subscribe(() => {
  version += 1;
});

export function useNoteState(): NoteState {
  return useSyncExternalStore(noteStore.subscribe, noteStore.getState, noteStore.getState);
}

/** Re-render on any store change (for undo/redo availability, which is outside NoteState). */
export function useStoreVersion(): number {
  return useSyncExternalStore(
    noteStore.subscribe,
    () => version,
    () => version,
  );
}
