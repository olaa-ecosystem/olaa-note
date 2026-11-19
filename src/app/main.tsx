import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StoreContext } from './context';
import { LibraryStore } from '../stores/libraryStore';
import { createDefaultRepository } from '../services/storage';
import '../styles/global.css';

const { repo, persistent } = createDefaultRepository();
const store = new LibraryStore(repo, persistent);
void store.load();

// Flush debounced writes when the tab is hidden or closed.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void store.flush();
});
window.addEventListener('pagehide', () => void store.flush());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>
  </StrictMode>,
);
