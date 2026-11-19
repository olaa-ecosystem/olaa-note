/** A notebook (module 03.01). Deleted notebooks stay in the trash for TRASH_DAYS (REQ-03-001). */
export interface Notebook {
  id: string;
  title: string;
  color: NotebookColor;
  createdAt: number;
  updatedAt: number;
  /** Ordered page ids. */
  pageIds: string[];
  deletedAt: number | null;
}

export const NOTEBOOK_COLORS = [
  'blue',
  'orange',
  'green',
  'red',
  'gold',
  'purple',
  'teal',
  'pink',
] as const;
export type NotebookColor = (typeof NOTEBOOK_COLORS)[number];

export const TRASH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isExpired(notebook: Notebook, now: number): boolean {
  return notebook.deletedAt !== null && now - notebook.deletedAt > TRASH_DAYS * DAY_MS;
}

export function daysLeftInTrash(notebook: Notebook, now: number): number {
  if (notebook.deletedAt === null) return TRASH_DAYS;
  return Math.max(0, Math.ceil(TRASH_DAYS - (now - notebook.deletedAt) / DAY_MS));
}

export const MAX_TITLE_LENGTH = 80;

export function cleanTitle(title: string): string {
  return title.trim().slice(0, MAX_TITLE_LENGTH) || 'Sổ tay chưa đặt tên';
}
