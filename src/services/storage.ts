import type { NoteDocument } from '../types/note';

/** Persistence port. Components never talk to IndexedDB directly. */
export interface DocumentRepository {
  list(): Promise<NoteDocument[]>;
  put(doc: NoteDocument): Promise<void>;
  remove(id: string): Promise<void>;
}

const DB_NAME = 'olaa-note';
const DB_VERSION = 1;
const STORE = 'documents';

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDbRepository implements DocumentRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: IDBFactory = indexedDB) {}

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = this.factory.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  async list(): Promise<NoteDocument[]> {
    const db = await this.db();
    return promisify(db.transaction(STORE, 'readonly').objectStore(STORE).getAll()) as Promise<
      NoteDocument[]
    >;
  }

  async put(doc: NoteDocument): Promise<void> {
    const db = await this.db();
    await promisify(db.transaction(STORE, 'readwrite').objectStore(STORE).put(doc));
  }

  async remove(id: string): Promise<void> {
    const db = await this.db();
    await promisify(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
  }
}

/** Fallback when IndexedDB is unavailable (e.g. some private modes). Data is not persisted. */
export class MemoryRepository implements DocumentRepository {
  private readonly docs = new Map<string, NoteDocument>();

  async list(): Promise<NoteDocument[]> {
    return [...this.docs.values()].map((d) => structuredClone(d));
  }

  async put(doc: NoteDocument): Promise<void> {
    this.docs.set(doc.id, structuredClone(doc));
  }

  async remove(id: string): Promise<void> {
    this.docs.delete(id);
  }
}

export function createDefaultRepository(): { repo: DocumentRepository; persistent: boolean } {
  try {
    if (typeof indexedDB !== 'undefined') {
      return { repo: new IndexedDbRepository(), persistent: true };
    }
  } catch {
    // fall through
  }
  return { repo: new MemoryRepository(), persistent: false };
}

/** Backup format for export/import. */
export interface BackupFile {
  app: 'olaa-note';
  version: 1;
  exportedAt: string;
  documents: NoteDocument[];
}

export function parseBackup(json: string): NoteDocument[] {
  const data = JSON.parse(json) as Partial<BackupFile>;
  if (data.app !== 'olaa-note' || data.version !== 1 || !Array.isArray(data.documents)) {
    throw new Error('Tệp sao lưu không hợp lệ.');
  }
  return data.documents.filter(
    (d): d is NoteDocument =>
      !!d && typeof d.id === 'string' && (d.kind === 'note' || d.kind === 'notebook'),
  );
}
