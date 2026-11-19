import { createContext, useContext } from 'react';
import type { LibraryStore } from '../stores/libraryStore';

export const StoreContext = createContext<LibraryStore | null>(null);

export function useStore(): LibraryStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreContext missing');
  return store;
}
