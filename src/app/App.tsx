import { LibraryPage } from '../features/library/LibraryPage';
import { ArchivePage } from '../features/library/ArchivePage';
import { TrashPage } from '../features/library/TrashPage';
import { SearchPage } from '../features/search/SearchPage';
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
    case 'archive':
      return <ArchivePage />;
    case 'search':
      return (
        <SearchPage key={`${route.query}|${route.tag ?? ''}`} query={route.query} tag={route.tag} />
      );
    case 'notebook':
      return <NotebookPage notebookId={route.notebookId} pageNumber={route.page} />;
    default:
      return <LibraryPage />;
  }
}
