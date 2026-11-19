import { useStore } from './context';
import { useLibrary } from '../stores/libraryStore';
import { navigate, useHashRoute } from '../hooks/useHashRoute';
import { LibraryView } from '../features/library/LibraryView';
import { NoteEditor } from '../features/note-editor/NoteEditor';
import { NotebookEditor } from '../features/notebook/NotebookEditor';

export function App() {
  const store = useStore();
  const state = useLibrary(store);
  const route = useHashRoute();

  if (state.status === 'loading') {
    return <div className="center-state">Đang tải thư viện…</div>;
  }
  if (state.status === 'error') {
    return (
      <div className="center-state" role="alert">
        <p>Không mở được dữ liệu cục bộ.</p>
        <p className="muted">{state.error}</p>
        <button className="btn" onClick={() => location.reload()}>
          Thử lại
        </button>
      </div>
    );
  }

  if (route.name === 'doc') {
    const doc = state.docs[route.id];
    if (!doc) {
      return (
        <div className="center-state">
          <p>Không tìm thấy ghi chú này.</p>
          <button className="btn" onClick={() => navigate({ name: 'library' })}>
            Về thư viện
          </button>
        </div>
      );
    }
    return doc.kind === 'note' ? (
      <NoteEditor key={doc.id} doc={doc} saveStatus={state.saveStatus} />
    ) : (
      <NotebookEditor key={doc.id} doc={doc} saveStatus={state.saveStatus} />
    );
  }

  return <LibraryView state={state} />;
}
