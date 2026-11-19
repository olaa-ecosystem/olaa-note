import { useState } from 'react';
import { routeHref } from '../../app/router';
import { TagIcon } from '../../components/Icons';
import {
  addPageTag,
  allTags,
  MAX_TAG_LENGTH,
  movePageToNotebook,
  removePageTag,
} from '../../stores/noteActions';
import { noteStore, useNoteState, useStoreVersion } from '../../stores/noteStore';

const SAVE_TEXT = {
  saving: 'Đang lưu…',
  saved: 'Đã lưu trên máy',
  error: 'Chưa lưu được',
} as const;

/** Visible save state (Ecosystem PRD v1.0 §8.2 Autosave, §16). */
export function SaveState() {
  useStoreVersion();
  const status = noteStore.saveState();
  return (
    <span className={`save-state save-state--${status}`} role="status" aria-live="polite">
      <span className="save-state__dot" aria-hidden />
      {SAVE_TEXT[status]}
    </span>
  );
}

/** Tags of the current page and moving it to another notebook (PRD v1.0 §8.2). */
export function PageMeta({
  pageId,
  tags,
  notebookId,
  canMove,
  onMoved,
}: {
  pageId: string;
  tags: string[];
  notebookId: string;
  canMove: boolean;
  onMoved: (targetId: string) => void;
}) {
  const state = useNoteState();
  const [draft, setDraft] = useState('');
  const known = allTags(state)
    .map((t) => t.tag)
    .filter((t) => !tags.includes(t));
  const others = Object.values(state.notebooks).filter(
    (n) => n.id !== notebookId && n.deletedAt === null,
  );

  const add = (raw: string) => {
    noteStore.update((s) => addPageTag(s, pageId, raw, Date.now()));
    setDraft('');
  };

  return (
    <div className="page-meta">
      <div className="page-meta__tags" role="group" aria-label="Thẻ của trang">
        <TagIcon />
        {tags.map((t) => (
          <span key={t} className="tag">
            <a href={routeHref({ name: 'search', query: '', tag: t })}>#{t}</a>
            <button
              type="button"
              className="tag__remove"
              aria-label={`Bỏ thẻ ${t}`}
              onClick={() => noteStore.update((s) => removePageTag(s, pageId, t, Date.now()))}
            >
              ×
            </button>
          </span>
        ))}
        <form
          className="tag-input"
          onSubmit={(e) => {
            e.preventDefault();
            add(draft);
          }}
        >
          <label className="visually-hidden" htmlFor={`tag-${pageId}`}>
            Thêm thẻ cho trang
          </label>
          <input
            id={`tag-${pageId}`}
            list={`tags-${pageId}`}
            value={draft}
            maxLength={MAX_TAG_LENGTH}
            placeholder="Thêm thẻ"
            onChange={(e) => setDraft(e.target.value)}
          />
          <datalist id={`tags-${pageId}`}>
            {known.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </form>
      </div>
      {canMove && others.length > 0 && (
        <label className="zoom page-meta__move">
          <span className="visually-hidden">Chuyển trang sang sổ khác</span>
          <select
            value=""
            onChange={(e) => {
              const target = e.target.value;
              if (!target) return;
              noteStore.update((s) => movePageToNotebook(s, pageId, target, Date.now()));
              onMoved(target);
            }}
          >
            <option value="">Chuyển trang sang sổ…</option>
            {others.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
