/**
 * Entry point. The interface (frontend) has been removed and will be imported later; it
 * mounts into #root. Until then only the notebook store runs: it loads saved notebooks and
 * writes pending pages before the tab goes away (NFR-03-002).
 */
import { noteStore } from './stores/noteStore';

void noteStore.load();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') noteStore.flush();
});
window.addEventListener('pagehide', () => noteStore.flush());
