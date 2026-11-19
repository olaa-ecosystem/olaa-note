import type { Page } from '../../types/note';

const LIMIT = 100;

interface Stacks {
  undo: Page[];
  redo: Page[];
}

/** Per-page undo/redo of whole-page snapshots (pages are immutable, so snapshots are cheap). */
export class PageHistory {
  private readonly stacks = new Map<string, Stacks>();

  private for(id: string): Stacks {
    let s = this.stacks.get(id);
    if (!s) {
      s = { undo: [], redo: [] };
      this.stacks.set(id, s);
    }
    return s;
  }

  /** Call with the page state *before* a change. */
  record(before: Page): void {
    const s = this.for(before.id);
    s.undo.push(before);
    if (s.undo.length > LIMIT) s.undo.shift();
    s.redo = [];
  }

  undo(current: Page): Page | undefined {
    const s = this.for(current.id);
    const prev = s.undo.pop();
    if (prev) s.redo.push(current);
    return prev;
  }

  redo(current: Page): Page | undefined {
    const s = this.for(current.id);
    const next = s.redo.pop();
    if (next) s.undo.push(current);
    return next;
  }

  canUndo(id: string): boolean {
    return (this.stacks.get(id)?.undo.length ?? 0) > 0;
  }

  canRedo(id: string): boolean {
    return (this.stacks.get(id)?.redo.length ?? 0) > 0;
  }

  forget(id: string): void {
    this.stacks.delete(id);
  }
}
