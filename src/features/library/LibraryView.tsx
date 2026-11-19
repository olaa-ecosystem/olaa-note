import { useMemo, useRef, useState } from 'react';
import type { NoteDocument } from '../../types/note';
import { useStore } from '../../app/context';
import type { LibraryState } from '../../stores/libraryStore';
import { navigate } from '../../hooks/useHashRoute';
import { Icon, type IconName } from '../../components/Icon';
import {
  allTags,
  createNotebook,
  createTextNote,
  displayTitle,
  previewText,
  sortDocuments,
} from '../../utils/documents';
import { matchesQuery } from '../../utils/search';
import { parseBackup, type BackupFile } from '../../services/storage';
import { downloadBlob } from '../ink/pageRenderer';
import { PageThumbnail } from '../ink/PageThumbnail';
import { NewNotebookDialog } from './NewNotebookDialog';

type Filter = 'all' | 'notes' | 'notebooks' | 'pinned' | 'trash' | `tag:${string}`;

const FILTERS: { id: Filter; label: string; icon: IconName }[] = [
  { id: 'all', label: 'Tất cả', icon: 'all' },
  { id: 'notes', label: 'Ghi chú', icon: 'note' },
  { id: 'notebooks', label: 'Sổ tay viết tay', icon: 'notebook' },
  { id: 'pinned', label: 'Đã ghim', icon: 'pin' },
  { id: 'trash', label: 'Thùng rác', icon: 'trash' },
];

function applyFilter(docs: NoteDocument[], filter: Filter): NoteDocument[] {
  if (filter === 'trash') return docs.filter((d) => d.trashedAt);
  const active = docs.filter((d) => !d.trashedAt);
  if (filter === 'notes') return active.filter((d) => d.kind === 'note');
  if (filter === 'notebooks') return active.filter((d) => d.kind === 'notebook');
  if (filter === 'pinned') return active.filter((d) => d.pinned);
  if (filter.startsWith('tag:')) return active.filter((d) => d.tags.includes(filter.slice(4)));
  return active;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function LibraryView({ state }: { state: LibraryState }) {
  const store = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const docs = useMemo(() => Object.values(state.docs), [state.docs]);
  const tags = useMemo(() => allTags(docs), [docs]);
  const visible = useMemo(
    () => sortDocuments(applyFilter(docs, filter).filter((d) => matchesQuery(d, query))),
    [docs, filter, query],
  );
  const trashCount = docs.filter((d) => d.trashedAt).length;
  const filterTag = filter.startsWith('tag:') ? filter.slice(4) : undefined;

  const newNote = () => {
    const doc = createTextNote({ tags: filterTag ? [filterTag] : [] });
    store.add(doc);
    navigate({ name: 'doc', id: doc.id });
  };

  const exportBackup = () => {
    const backup: BackupFile = {
      app: 'olaa-note',
      version: 1,
      exportedAt: new Date().toISOString(),
      documents: docs,
    };
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(new Blob([JSON.stringify(backup)], { type: 'application/json' }), `olaa-note-${stamp}.json`);
  };

  const importBackup = async (file: File) => {
    try {
      const imported = parseBackup(await file.text());
      const n = await store.importDocuments(imported);
      setMessage(`Đã nhập ${n} mục (${imported.length - n} mục bỏ qua vì đã có bản mới hơn).`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Không nhập được tệp.');
    }
  };

  const emptyTrash = async () => {
    if (!confirm(`Xoá vĩnh viễn ${trashCount} mục trong thùng rác? Không thể hoàn tác.`)) return;
    for (const d of docs.filter((x) => x.trashedAt)) await store.deleteForever(d.id);
  };

  const heading =
    filterTag !== undefined ? `#${filterTag}` : (FILTERS.find((f) => f.id === filter)?.label ?? 'Tất cả');

  return (
    <div className="library">
      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Thư mục">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <Icon name="note" size={18} />
          </span>
          OLAA Note
        </div>
        <nav>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`nav-item${filter === f.id ? ' is-active' : ''}`}
              onClick={() => {
                setFilter(f.id);
                setSidebarOpen(false);
              }}
            >
              <Icon name={f.icon} size={18} />
              <span>{f.label}</span>
              {f.id === 'trash' && trashCount > 0 && <span className="count">{trashCount}</span>}
            </button>
          ))}
        </nav>
        {tags.length > 0 && (
          <>
            <h3 className="nav-heading">Thẻ</h3>
            <nav className="tag-nav">
              {tags.map((t) => (
                <button
                  key={t}
                  className={`nav-item${filter === `tag:${t}` ? ' is-active' : ''}`}
                  onClick={() => {
                    setFilter(`tag:${t}`);
                    setSidebarOpen(false);
                  }}
                >
                  <span className="hash">#</span>
                  <span>{t}</span>
                </button>
              ))}
            </nav>
          </>
        )}
        <div className="sidebar-footer">
          <button className="nav-item" onClick={exportBackup}>
            <Icon name="download" size={18} />
            <span>Sao lưu (JSON)</span>
          </button>
          <button className="nav-item" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" size={18} />
            <span>Khôi phục từ tệp</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importBackup(f);
              e.target.value = '';
            }}
          />
          {!state.persistent && (
            <p className="warning">Trình duyệt không hỗ trợ lưu trữ cục bộ — dữ liệu sẽ mất khi đóng tab.</p>
          )}
        </div>
      </aside>
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <main className="library-main">
        <header className="library-header">
          <button className="icon-btn only-narrow" aria-label="Mở thư mục" onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" />
          </button>
          <h1>{heading}</h1>
          <div className="search">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm (gõ #thẻ để lọc thẻ)"
              aria-label="Tìm kiếm ghi chú"
            />
          </div>
          {filter === 'trash' ? (
            <button className="btn danger" disabled={trashCount === 0} onClick={() => void emptyTrash()}>
              Dọn thùng rác
            </button>
          ) : (
            <div className="create-actions">
              <button className="btn" onClick={newNote}>
                <Icon name="note" size={18} /> Ghi chú
              </button>
              <button className="btn primary" onClick={() => setShowNewNotebook(true)}>
                <Icon name="plus" size={18} /> Sổ tay
              </button>
            </div>
          )}
        </header>

        {message && (
          <div className="banner" role="status">
            {message}
            <button className="icon-btn" aria-label="Đóng" onClick={() => setMessage(null)}>
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState filter={filter} hasQuery={!!query.trim()} onNewNote={newNote} />
        ) : (
          <ul className="doc-grid">
            {visible.map((doc) => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </ul>
        )}
      </main>

      {showNewNotebook && (
        <NewNotebookDialog
          onCancel={() => setShowNewNotebook(false)}
          onCreate={(input) => {
            const nb = createNotebook({ ...input, tags: filterTag ? [filterTag] : [] });
            store.add(nb);
            setShowNewNotebook(false);
            navigate({ name: 'doc', id: nb.id });
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ filter, hasQuery, onNewNote }: { filter: Filter; hasQuery: boolean; onNewNote: () => void }) {
  if (hasQuery) return <div className="empty">Không có kết quả phù hợp.</div>;
  if (filter === 'trash') return <div className="empty">Thùng rác trống.</div>;
  return (
    <div className="empty">
      <p>Chưa có gì ở đây.</p>
      <button className="btn primary" onClick={onNewNote}>
        Viết ghi chú đầu tiên
      </button>
    </div>
  );
}

function DocCard({ doc }: { doc: NoteDocument }) {
  const store = useStore();
  const open = () => !doc.trashedAt && navigate({ name: 'doc', id: doc.id });
  const title = displayTitle(doc);

  return (
    <li className={`doc-card kind-${doc.kind}`}>
      <button className="doc-card-body" onClick={open} disabled={!!doc.trashedAt} aria-label={`Mở ${title}`}>
        {doc.kind === 'notebook' ? (
          <div className="notebook-thumb">
            <div className="cover" style={{ background: doc.cover }}>
              <span>{title}</span>
            </div>
            <PageThumbnail page={doc.pages[0]} paper={doc.paper} width={150} className="first-page" />
          </div>
        ) : (
          <div className="note-thumb">
            <p>{previewText(doc)}</p>
          </div>
        )}
      </button>
      <div className="doc-card-meta">
        <div className="doc-card-title">
          {doc.pinned && <Icon name="pin" size={14} />}
          <span>{title}</span>
        </div>
        <div className="doc-card-sub">
          {formatDate(doc.updatedAt)}
          {doc.kind === 'notebook' && ` · ${doc.pages.length} trang`}
          {doc.tags.slice(0, 2).map((t) => (
            <span key={t} className="mini-tag">
              #{t}
            </span>
          ))}
        </div>
      </div>
      <div className="doc-card-actions">
        {doc.trashedAt ? (
          <>
            <button className="icon-btn" title="Khôi phục" aria-label="Khôi phục" onClick={() => store.restore(doc.id)}>
              <Icon name="restore" size={16} />
            </button>
            <button
              className="icon-btn danger"
              title="Xoá vĩnh viễn"
              aria-label="Xoá vĩnh viễn"
              onClick={() => confirm(`Xoá vĩnh viễn "${title}"?`) && void store.deleteForever(doc.id)}
            >
              <Icon name="trash" size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              className={`icon-btn${doc.pinned ? ' is-on' : ''}`}
              title={doc.pinned ? 'Bỏ ghim' : 'Ghim'}
              aria-label={doc.pinned ? 'Bỏ ghim' : 'Ghim'}
              aria-pressed={doc.pinned}
              onClick={() => store.update(doc.id, (d) => ({ ...d, pinned: !d.pinned }), false)}
            >
              <Icon name="pin" size={16} />
            </button>
            <button className="icon-btn" title="Chuyển vào thùng rác" aria-label="Chuyển vào thùng rác" onClick={() => store.trash(doc.id)}>
              <Icon name="trash" size={16} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
