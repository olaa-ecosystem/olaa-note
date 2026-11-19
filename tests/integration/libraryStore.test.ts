import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryStore } from '../../src/stores/libraryStore';
import { IndexedDbRepository, MemoryRepository, parseBackup } from '../../src/services/storage';
import { createNotebook, createTextNote } from '../../src/utils/documents';
import type { TextNote } from '../../src/types/note';

afterEach(() => {
  vi.useRealTimers();
});

describe('LibraryStore', () => {
  it('persists added and updated documents to IndexedDB', async () => {
    const store = new LibraryStore(new IndexedDbRepository());
    await store.load();
    const note = createTextNote({ title: 'A' });
    store.add(note);
    store.update<TextNote>(note.id, (d) => ({ ...d, title: 'B' }));
    await store.flush();

    const reloaded = new LibraryStore(new IndexedDbRepository());
    await reloaded.load();
    expect(reloaded.get(note.id)?.title).toBe('B');
  });

  it('trashes, restores and deletes forever', async () => {
    const repo = new MemoryRepository();
    const store = new LibraryStore(repo);
    await store.load();
    const nb = createNotebook();
    store.add(nb);
    store.trash(nb.id);
    expect(store.get(nb.id)?.trashedAt).toBeTruthy();
    store.restore(nb.id);
    expect(store.get(nb.id)?.trashedAt).toBeUndefined();
    await store.deleteForever(nb.id);
    expect(store.get(nb.id)).toBeUndefined();
    expect(await repo.list()).toHaveLength(0);
  });

  it('debounces writes', async () => {
    vi.useFakeTimers();
    const repo = new MemoryRepository();
    const put = vi.spyOn(repo, 'put');
    const store = new LibraryStore(repo);
    await store.load();
    const note = createTextNote();
    store.add(note);
    await Promise.resolve();
    put.mockClear();
    for (let i = 0; i < 5; i++) store.update<TextNote>(note.id, (d) => ({ ...d, title: String(i) }));
    expect(put).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('imports only newer copies', async () => {
    const store = new LibraryStore(new MemoryRepository());
    await store.load();
    const note = createTextNote({ title: 'local', updatedAt: '2026-05-01T00:00:00.000Z' });
    store.add(note);
    const older = { ...note, title: 'old', updatedAt: '2026-01-01T00:00:00.000Z' };
    const fresh = createTextNote({ title: 'new' });
    expect(await store.importDocuments([older, fresh])).toBe(1);
    expect(store.get(note.id)?.title).toBe('local');
    expect(store.get(fresh.id)?.title).toBe('new');
  });
});

describe('parseBackup', () => {
  it('rejects foreign files', () => {
    expect(() => parseBackup('{"foo":1}')).toThrow();
  });
  it('keeps valid documents', () => {
    const doc = createTextNote();
    const json = JSON.stringify({ app: 'olaa-note', version: 1, exportedAt: '', documents: [doc, { bad: true }] });
    expect(parseBackup(json)).toHaveLength(1);
  });
});
