import type { Item } from '../digital-canvas/items';

/** Undo / redo for one page (REQ-03-015). Snapshots are immutable item arrays. */
export interface History {
  past: Item[][];
  future: Item[][];
}

export const MAX_HISTORY = 100;

export function emptyHistory(): History {
  return { past: [], future: [] };
}

/** Record that `before` is being replaced by a new version. */
export function record(history: History, before: Item[]): History {
  const past = [...history.past, before];
  return { past: past.length > MAX_HISTORY ? past.slice(-MAX_HISTORY) : past, future: [] };
}

export function undo(
  history: History,
  current: Item[],
): { history: History; items: Item[] } | null {
  const prev = history.past[history.past.length - 1];
  if (!prev) return null;
  return {
    history: { past: history.past.slice(0, -1), future: [current, ...history.future] },
    items: prev,
  };
}

export function redo(
  history: History,
  current: Item[],
): { history: History; items: Item[] } | null {
  const next = history.future[0];
  if (!next) return null;
  return {
    history: { past: [...history.past, current], future: history.future.slice(1) },
    items: next,
  };
}
