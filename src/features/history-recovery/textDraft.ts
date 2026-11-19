/**
 * Crash recovery for text being typed (Ecosystem PRD v1.0 §8.2 Autosave: "recover interrupted
 * drafts"). A text box is stored when it loses focus; until then the latest typing is kept
 * here, so closing the tab or a crash mid-sentence does not lose it.
 */
const KEY = 'olaa-takenote/text-draft';

export interface TextDraft {
  pageId: string;
  /** The text box being edited, or null for a new one. */
  itemId: string | null;
  x: number;
  y: number;
  html: string;
  at: number;
}

export function saveTextDraft(draft: TextDraft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Without storage there is nothing to recover from; normal saving still works.
  }
}

export function loadTextDraft(): TextDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<TextDraft>;
    if (typeof d.pageId !== 'string' || typeof d.html !== 'string') return null;
    return {
      pageId: d.pageId,
      itemId: d.itemId ?? null,
      x: Number(d.x) || 40,
      y: Number(d.y) || 40,
      html: d.html,
      at: Number(d.at) || 0,
    };
  } catch {
    return null;
  }
}

export function clearTextDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}
