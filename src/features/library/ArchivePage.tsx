import { routeHref } from '../../app/router';
import { BackIcon } from '../../components/Icons';
import { setArchived } from '../../stores/noteActions';
import { noteStore, useNoteState } from '../../stores/noteStore';

/** Archived notebooks: kept and searchable, hidden from the library (PRD v1.0 §8.2). */
export function ArchivePage() {
  const state = useNoteState();
  const archived = Object.values(state.notebooks)
    .filter((n) => n.deletedAt === null && n.archivedAt)
    .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
  return (
    <div className="library">
      <header className="library__head">
        <a className="icon-btn" href={routeHref({ name: 'library' })} aria-label="Về thư viện">
          <BackIcon />
        </a>
        <h1>Đã lưu trữ</h1>
      </header>
      <p className="muted">Sổ lưu trữ không hiện trong thư viện nhưng vẫn mở và tìm được.</p>
      {archived.length === 0 ? (
        <div className="card empty">
          <p>Chưa lưu trữ sổ nào.</p>
        </div>
      ) : (
        <ul className="trash-list">
          {archived.map((nb) => (
            <li key={nb.id} className="card trash-row">
              <span className={`trash-row__dot nb-color--${nb.color}`} aria-hidden />
              <a
                className="trash-row__text"
                href={routeHref({ name: 'notebook', notebookId: nb.id, page: 1 })}
              >
                <strong>{nb.title}</strong>
                <span className="muted small">{nb.pageIds.length} trang</span>
              </a>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => noteStore.update((s) => setArchived(s, nb.id, false, Date.now()))}
              >
                Đưa về thư viện
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
