import { LibraryPage } from '../features/library/LibraryPage';
import { TrashPage } from '../features/library/TrashPage';
import { NotebookPage } from '../features/notebook-management/NotebookPage';
import { useNoteState } from '../stores/noteStore';
import { parseRoute, useHash } from './router';

export function App() {
  const state = useNoteState();
  const route = parseRoute(useHash());
  if (!state.ready) return <p className="notice">Đang mở…</p>;
  switch (route.name) {
    case 'trash':
      return <TrashPage />;
    case 'notebook':
      return <NotebookPage notebookId={route.notebookId} pageNumber={route.page} />;
    default:
      return <LibraryPage />;
  }
}
