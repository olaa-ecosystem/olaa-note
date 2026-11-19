/**
 * IndexedDB storage for notebooks, pages and attached files (NFR-03-002). Files (PDF page
 * images, photos, attachments) are stored as Blobs, which localStorage cannot hold.
 */
import type { Notebook } from '../features/notebook-management/types';
import type { Page } from '../features/page-management/types';

const DB_NAME = 'olaa-takenote';
const DB_VERSION = 1;

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('notebooks'))
        db.createObjectStore('notebooks', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('pages')) db.createObjectStore('pages', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

type StoreName = 'notebooks' | 'pages' | 'files';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return request(run(db.transaction(store, mode).objectStore(store)));
}

export const db = {
  allNotebooks: () =>
    tx<Notebook[]>('notebooks', 'readonly', (s) => s.getAll() as IDBRequest<Notebook[]>),
  allPages: () => tx<Page[]>('pages', 'readonly', (s) => s.getAll() as IDBRequest<Page[]>),
  putNotebook: (n: Notebook) => tx('notebooks', 'readwrite', (s) => s.put(n)),
  deleteNotebook: (id: string) => tx('notebooks', 'readwrite', (s) => s.delete(id)),
  putPage: (p: Page) => tx('pages', 'readwrite', (s) => s.put(p)),
  deletePage: (id: string) => tx('pages', 'readwrite', (s) => s.delete(id)),
  putFile: (f: StoredFile) => tx('files', 'readwrite', (s) => s.put(f)),
  getFile: (id: string) =>
    tx<StoredFile | undefined>(
      'files',
      'readonly',
      (s) => s.get(id) as IDBRequest<StoredFile | undefined>,
    ),
  deleteFile: (id: string) => tx('files', 'readwrite', (s) => s.delete(id)),
  /** Ask the browser not to evict our data under storage pressure (NFR-03-002). */
  async persist(): Promise<boolean> {
    try {
      return (await navigator.storage?.persist?.()) ?? false;
    } catch {
      return false;
    }
  },
  /** For tests: forget the cached connection. */
  reset(): void {
    dbPromise = null;
  },
};

/** Object URLs for stored files, created once and reused. */
const urlCache = new Map<string, Promise<string | null>>();

export function fileUrl(fileId: string): Promise<string | null> {
  let p = urlCache.get(fileId);
  if (!p) {
    p = db.getFile(fileId).then((f) => (f ? URL.createObjectURL(f.blob) : null));
    urlCache.set(fileId, p);
  }
  return p;
}
