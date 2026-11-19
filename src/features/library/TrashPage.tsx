import { useState } from 'react';
import { routeHref } from '../../app/router';
import { BackIcon } from '../../components/Icons';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { deleteNotebookForever, restoreNotebook } from '../../stores/noteActions';
import { noteStore, useNoteState } from '../../stores/noteStore';
import { daysLeftInTrash, TRASH_DAYS, type Notebook } from '../notebook-management/types';

/** Deleted notebooks, restorable for TRASH_DAYS (REQ-03-001). */
export function TrashPage() {
  const state = useNoteState();
  const [confirm, setConfirm] = useState<Notebook | null>(null);
  const now = Date.now();
  const trashed = Object.values(state.notebooks)
    .filter((n) => n.deletedAt !== null)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));

  return (
    <div className="library">
      <header className="library__head">
        <a className="icon-btn" href={routeHref({ name: 'library' })} aria-label="Về thư viện">
          <BackIcon />
        </a>
        <h1>Thùng rác</h1>
      </header>
      <p className="muted">Sổ tay bị xoá được giữ {TRASH_DAYS} ngày rồi xoá hẳn.</p>
      {trashed.length === 0 ? (
        <div className="card empty">
          <p>Thùng rác trống.</p>
        </div>
      ) : (
        <ul className="trash-list">
          {trashed.map((nb) => (
            <li key={nb.id} className="card trash-row">
              <span className={`trash-row__dot nb-color--${nb.color}`} aria-hidden />
              <span className="trash-row__text">
                <strong>{nb.title}</strong>
                <span className="muted small">
                  {nb.pageIds.length} trang · còn {daysLeftInTrash(nb, now)} ngày
                </span>
              </span>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => noteStore.update((s) => restoreNotebook(s, nb.id, Date.now()))}
              >
                Khôi phục
              </button>
              <button
                type="button"
                className="link-btn link-btn--danger"
                onClick={() => setConfirm(nb)}
              >
                Xoá hẳn
              </button>
            </li>
          ))}
        </ul>
      )}
      {confirm && (
        <ConfirmDialog
          title="Xoá hẳn sổ tay?"
          message={`"${confirm.title}" và mọi trang, ảnh, tệp đính kèm sẽ bị xoá khỏi máy. Không thể hoàn tác.`}
          confirmLabel="Xoá hẳn"
          onConfirm={() => {
            noteStore.update((s) => deleteNotebookForever(s, confirm.id));
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
