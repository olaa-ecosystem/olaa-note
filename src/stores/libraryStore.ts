import { useSyncExternalStore } from 'react';
import type { NoteDocument } from '../types/note';
import type { DocumentRepository } from '../services/storage';
import { nowIso } from '../utils/id';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface LibraryState {
  status: 'loading' | 'ready' | 'error';
  persistent: boolean;
  docs: Record<string, NoteDocument>;
  saveStatus: SaveStatus;
  error?: string;
}

const SAVE_DELAY_MS = 400;

/**
 * Library store: in-memory source of truth, write-behind persistence to a repository.
 * Writes are debounced per document; `flush()` forces pending writes (e.g. on page hide).
 */
export class LibraryStore {
  private state: LibraryState = { status: 'loading', persistent: true, docs: {}, saveStatus: 'idle' };
  private readonly listeners = new Set<() => void>();
  private readonly pending = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly repo: DocumentRepository,
    persistent = true,
  ) {
    this.state = { ...this.state, persistent };
  }

  getState = (): LibraryState => this.state;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private set(patch: Partial<LibraryState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  async load(): Promise<void> {
    try {
      const list = await this.repo.list();
      const docs: Record<string, NoteDocument> = {};
      for (const d of list) docs[d.id] = d;
      this.set({ status: 'ready', docs });
    } catch (e) {
      this.set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  }

  get(id: string): NoteDocument | undefined {
    return this.state.docs[id];
  }

  /** Insert a brand-new document and persist immediately. */
  add(doc: NoteDocument): void {
    this.set({ docs: { ...this.state.docs, [doc.id]: doc } });
    void this.persist(doc.id);
  }

  /** Apply an update and schedule a debounced save. Bumps `updatedAt` unless `touch` is false. */
  update<T extends NoteDocument>(id: string, updater: (doc: T) => T, touch = true): void {
    const current = this.state.docs[id] as T | undefined;
    if (!current) return;
    const next = updater(current);
    if (next === current) return;
    const stamped = touch ? { ...next, updatedAt: nowIso() } : next;
    this.set({ docs: { ...this.state.docs, [id]: stamped }, saveStatus: 'saving' });
    this.schedule(id);
  }

  trash(id: string): void {
    this.update(id, (d) => ({ ...d, trashedAt: nowIso(), pinned: false }), false);
  }

  restore(id: string): void {
    this.update(id, (d) => ({ ...d, trashedAt: undefined }), false);
  }

  async deleteForever(id: string): Promise<void> {
    const timer = this.pending.get(id);
    if (timer) clearTimeout(timer);
    this.pending.delete(id);
    const { [id]: _removed, ...rest } = this.state.docs;
    this.set({ docs: rest });
    await this.repo.remove(id);
  }

  /** Import documents; existing ids are overwritten only when the incoming copy is newer. */
  async importDocuments(docs: NoteDocument[]): Promise<number> {
    let count = 0;
    const merged = { ...this.state.docs };
    for (const d of docs) {
      const existing = merged[d.id];
      if (existing && existing.updatedAt >= d.updatedAt) continue;
      merged[d.id] = d;
      count++;
    }
    this.set({ docs: merged });
    await Promise.all(docs.filter((d) => merged[d.id] === d).map((d) => this.repo.put(d)));
    return count;
  }

  private schedule(id: string): void {
    const existing = this.pending.get(id);
    if (existing) clearTimeout(existing);
    this.pending.set(
      id,
      setTimeout(() => {
        this.pending.delete(id);
        void this.persist(id);
      }, SAVE_DELAY_MS),
    );
  }

  private async persist(id: string): Promise<void> {
    const doc = this.state.docs[id];
    if (!doc) return;
    try {
      await this.repo.put(doc);
      if (this.pending.size === 0) this.set({ saveStatus: 'saved' });
    } catch (e) {
      this.set({ saveStatus: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  }

  async flush(): Promise<void> {
    const ids = [...this.pending.keys()];
    ids.forEach((id) => clearTimeout(this.pending.get(id)));
    this.pending.clear();
    await Promise.all(ids.map((id) => this.persist(id)));
  }
}

export function useLibrary(store: LibraryStore): LibraryState {
  return useSyncExternalStore(store.subscribe, store.getState);
}
