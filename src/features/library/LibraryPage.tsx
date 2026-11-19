import { useRef, useState } from 'react';
import { navigate, routeHref } from '../../app/router';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PdfIcon, PlusIcon, TrashIcon } from '../../components/Icons';
import { trashNotebook } from '../../stores/noteActions';
import { noteStore, useNoteState } from '../../stores/noteStore';
import { PageView } from '../digital-canvas/layers';
import { PdfImportError } from '../document-annotation/importPdf';
import { createEmptyNotebook, insertPdf } from '../notebook-management/commands';
import { NOTEBOOK_COLORS, type Notebook, type NotebookColor } from '../notebook-management/types';
import { PAGE_TEMPLATES, type PageTemplate } from '../page-management/types';
import { paperCss } from '../page-management/paper';

const COLOR_NAMES: Record<NotebookColor, string> = {
  blue: 'Xanh dương',
  orange: 'Cam',
  green: 'Xanh lá',
  red: 'Đỏ',
  gold: 'Vàng',
  purple: 'Tím',
  teal: 'Xanh ngọc',
  pink: 'Hồng',
};

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** All notebooks (module 03.01), newest first. */
export function LibraryPage() {
  const state = useNoteState();
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<Notebook | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  const notebooks = Object.values(state.notebooks)
    .filter((n) => n.deletedAt === null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const trashCount = Object.values(state.notebooks).filter((n) => n.deletedAt !== null).length;

  const onPdf = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setImporting('Đang mở PDF…');
    try {
      const { notebookId } = await insertPdf(file, { newNotebook: 'blue' }, (done, total) =>
        setImporting(`Đang nhập trang ${done}/${total}…`),
      );
      navigate({ name: 'notebook', notebookId, page: 1 });
    } catch (e) {
      setError(e instanceof PdfImportError ? e.message : 'Không nhập được PDF. Thử lại nhé.');
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="library">
      <header className="library__head">
        <h1 className="logo">
          olaa<span>takenote</span>
        </h1>
        <div className="library__actions">
          <button type="button" className="btn" onClick={() => setCreating(true)}>
            <PlusIcon /> Sổ tay mới
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => pdfInput.current?.click()}
            disabled={importing !== null}
          >
            <PdfIcon /> Nhập PDF
          </button>
          <input
            ref={pdfInput}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              void onPdf(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {importing && (
        <p className="notice" role="status">
          {importing}
        </p>
      )}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {creating && (
        <NewNotebookForm
          onDone={(id) => {
            setCreating(false);
            if (id) navigate({ name: 'notebook', notebookId: id, page: 1 });
          }}
        />
      )}

      {notebooks.length === 0 && !creating ? (
        <div className="card empty">
          <p>Chưa có sổ tay nào. Tạo sổ mới, hoặc nhập slide bài giảng dạng PDF để viết lên.</p>
        </div>
      ) : (
        <ul className="covers" aria-label="Sổ tay">
          {notebooks.map((nb) => {
            const first = state.pages[nb.pageIds[0] ?? ''];
            return (
              <li key={nb.id} className={`cover nb-color--${nb.color}`}>
                <a
                  className="cover__link"
                  href={routeHref({ name: 'notebook', notebookId: nb.id, page: 1 })}
                >
                  <span className="cover__thumb">
                    {first && <PageView page={first} scale={0.2} />}
                  </span>
                  <span className="cover__title">{nb.title}</span>
                  <span className="cover__meta">
                    {nb.pageIds.length} trang · {formatDate(nb.updatedAt)}
                  </span>
                </a>
                <button
                  type="button"
                  className="icon-btn cover__delete"
                  aria-label={`Xoá ${nb.title}`}
                  onClick={() => setConfirm(nb)}
                >
                  <TrashIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <a className="link-btn" href={routeHref({ name: 'trash' })}>
        Thùng rác{trashCount > 0 ? ` (${trashCount})` : ''}
      </a>

      {confirm && (
        <ConfirmDialog
          title="Chuyển vào thùng rác?"
          message={`"${confirm.title}" sẽ nằm trong thùng rác 30 ngày, sau đó bị xoá hẳn. Bạn có thể khôi phục trong thời gian đó.`}
          confirmLabel="Chuyển vào thùng rác"
          onConfirm={() => {
            noteStore.update((s) => trashNotebook(s, confirm.id, Date.now()));
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function NewNotebookForm({ onDone }: { onDone: (id: string | null) => void }) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<NotebookColor>('blue');
  const [template, setTemplate] = useState<PageTemplate>('lined');
  return (
    <form
      className="card stack new-notebook"
      onSubmit={(e) => {
        e.preventDefault();
        onDone(createEmptyNotebook(title, color, template));
      }}
    >
      <h2>Sổ tay mới</h2>
      <label className="field">
        <span>Tên sổ</span>
        <input
          value={title}
          maxLength={80}
          placeholder="Ví dụ: Tiếng Anh — Unit 3"
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </label>
      <fieldset>
        <legend>Màu bìa</legend>
        <div className="picker">
          {NOTEBOOK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch nb-color--${c} ${color === c ? 'is-selected' : ''}`}
              aria-pressed={color === c}
              aria-label={COLOR_NAMES[c]}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Giấy</legend>
        <div className="paper-picker">
          {PAGE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`paper-option ${template === t.id ? 'is-selected' : ''}`}
              aria-pressed={template === t.id}
              onClick={() => setTemplate(t.id)}
            >
              <span className="paper-option__sample" style={paperCss(t.id)} />
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-actions">
        <button type="submit" className="btn">
          Tạo sổ tay
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => onDone(null)}>
          Huỷ
        </button>
      </div>
    </form>
  );
}
