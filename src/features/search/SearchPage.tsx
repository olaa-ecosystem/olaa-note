import { useMemo, useState } from 'react';
import { navigate, routeHref } from '../../app/router';
import { BackIcon } from '../../components/Icons';
import { allTags, renameTag } from '../../stores/noteActions';
import { noteStore, useNoteState } from '../../stores/noteStore';
import { search, type SearchHit } from './search';

const FIELD_LABEL: Record<SearchHit['field'], string> = {
  title: 'Tên sổ',
  text: 'Chữ',
  file: 'Tệp',
  tag: 'Thẻ',
};

/** Search titles, typed text, file names and tags; filter by tag (PRD v1.0 §8.2). */
export function SearchPage({ query, tag }: { query: string; tag: string | null }) {
  const state = useNoteState();
  const [text, setText] = useState(query);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const tags = allTags(state);
  const hits = useMemo(
    () => (text.trim() || tag ? search(state, text, { tag, includeArchived }) : []),
    [state, text, tag, includeArchived],
  );

  const goTag = (t: string | null) => navigate({ name: 'search', query: '', tag: t }, true);

  return (
    <div className="library">
      <header className="library__head">
        <a className="icon-btn" href={routeHref({ name: 'library' })} aria-label="Về thư viện">
          <BackIcon />
        </a>
        <h1>Tìm kiếm</h1>
      </header>

      <form
        className="search-bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ name: 'search', query: text, tag: null }, true);
        }}
      >
        <label className="visually-hidden" htmlFor="search-input">
          Tìm trong sổ tay
        </label>
        <input
          id="search-input"
          type="search"
          value={text}
          autoFocus
          placeholder="Tìm tên sổ, chữ đã gõ, tên tệp, thẻ…"
          onChange={(e) => setText(e.target.value)}
        />
      </form>

      {tags.length > 0 && (
        <div className="tag-filter" role="group" aria-label="Lọc theo thẻ">
          <button
            type="button"
            className={`chip ${tag === null ? 'is-selected' : ''}`}
            aria-pressed={tag === null}
            onClick={() => goTag(null)}
          >
            Mọi thẻ
          </button>
          {tags.map((t) => (
            <button
              key={t.tag}
              type="button"
              className={`chip ${tag === t.tag ? 'is-selected' : ''}`}
              aria-pressed={tag === t.tag}
              onClick={() => goTag(t.tag)}
            >
              #{t.tag} <span className="muted">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      <label className="toggle-line">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
        />
        Tìm cả sổ đã lưu trữ
      </label>

      {(text.trim() || tag) && (
        <p className="muted small" aria-live="polite">
          {hits.length === 0 ? 'Không tìm thấy kết quả.' : `${hits.length} kết quả.`} Chữ viết tay và
          nội dung PDF chưa được tìm.
        </p>
      )}

      <ul className="results">
        {hits.map((h) => {
          const nb = state.notebooks[h.notebookId]!;
          return (
            <li key={`${h.pageId}-${h.field}`}>
              <a
                className={`result nb-color--${nb.color}`}
                href={routeHref({ name: 'notebook', notebookId: nb.id, page: h.page })}
              >
                <span className="result__where">
                  <strong>{nb.title}</strong> · trang {h.page} · {FIELD_LABEL[h.field]}
                </span>
                <span className="result__snippet">
                  {h.match ? (
                    <>
                      {h.snippet.slice(0, h.match[0])}
                      <mark>{h.snippet.slice(h.match[0], h.match[1])}</mark>
                      {h.snippet.slice(h.match[1])}
                    </>
                  ) : (
                    h.snippet
                  )}
                </span>
                {h.tags.length > 0 && (
                  <span className="result__tags">{h.tags.map((t) => `#${t}`).join(' ')}</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>

      {tags.length > 0 && (
        <section className="card stack">
          <h2>Quản lý thẻ</h2>
          <p className="muted small">
            Đổi tên một thẻ ở mọi trang. Đặt trùng tên thẻ có sẵn để gộp hai thẻ.
          </p>
          <ul className="tag-admin">
            {tags.map((t) => (
              <li key={t.tag}>
                {renaming === t.tag ? (
                  <form
                    className="tag-admin__form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      noteStore.update((s) => renameTag(s, t.tag, newName, Date.now()));
                      setRenaming(null);
                    }}
                  >
                    <label className="visually-hidden" htmlFor={`rename-${t.tag}`}>
                      Tên mới cho #{t.tag}
                    </label>
                    <input
                      id={`rename-${t.tag}`}
                      value={newName}
                      autoFocus
                      maxLength={32}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <button type="submit" className="btn btn--small">
                      Lưu
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => setRenaming(null)}
                    >
                      Huỷ
                    </button>
                  </form>
                ) : (
                  <>
                    <span>
                      #{t.tag} <span className="muted small">{t.count} trang</span>
                    </span>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setRenaming(t.tag);
                        setNewName(t.tag);
                      }}
                    >
                      Đổi tên
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
