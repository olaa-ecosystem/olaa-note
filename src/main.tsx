import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { noteStore } from './stores/noteStore';
import './styles/global.css';
import './styles/layout.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

void noteStore.load();
// Write pending pages before the tab goes away (NFR-03-002).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') noteStore.flush();
});
window.addEventListener('pagehide', () => noteStore.flush());

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
