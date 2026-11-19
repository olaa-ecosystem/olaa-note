import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { navigate, routeHref } from '../../app/router';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  BackIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipIcon,
  CopyIcon,
  EraserIcon,
  HandIcon,
  HighlighterIcon,
  ImageIcon,
  PagesIcon,
  PdfIcon,
  PenIcon,
  PlusIcon,
  RedoIcon,
  SelectIcon,
  ShareIcon,
  TextIcon,
  TrashIcon,
  UndoIcon,
} from '../../components/Icons';
import {
  addPage,
  duplicatePage,
  movePage,
  newPage,
  removePage,
  setPageTemplate,
  updateNotebook,
} from '../../stores/noteActions';
import { noteStore, useNoteState, useStoreVersion } from '../../stores/noteStore';
import { newId } from '../../utils/id';
import { PageView } from '../digital-canvas/layers';
import { PageEditor, type InkSettings, type Tool } from '../digital-canvas/PageEditor';
import { PdfImportError } from '../document-annotation/importPdf';
import { exportPdf, safeFileName, shareOrDownload } from '../export-sharing/exportPdf';
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_WIDTHS,
  INK_COLORS,
  PEN_WIDTHS,
} from '../inking-tools/strokePath';
import { PAGE_TEMPLATES, pageSize, type PageTemplate } from '../page-management/types';
import { attachFile, insertPdf, openStoredFile } from './commands';
import { clearTextDraft, loadTextDraft, type TextDraft } from '../history-recovery/textDraft';
import {
  isBlank,
  safeHref,
  sanitizeHtml,
  toggleChecklistAtSelection,
} from '../rich-text-editor/richText';
import { DEFAULT_TEXT_WIDTH } from '../rich-text-editor/textStyle';
import { PageMeta, SaveState } from './NotebookExtras';

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;

const TOOLS: { id: Tool; label: string; icon: JSX.Element }[] = [
  { id: 'pen', label: 'Bút', icon: <PenIcon /> },
  { id: 'highlighter', label: 'Dạ quang', icon: <HighlighterIcon /> },
  { id: 'eraser', label: 'Tẩy', icon: <EraserIcon /> },
  { id: 'text', label: 'Chữ', icon: <TextIcon /> },
  { id: 'select', label: 'Chọn', icon: <SelectIcon /> },
];

function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`olaa-takenote/${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: unknown) {
  try {
    localStorage.setItem(`olaa-takenote/${key}`, JSON.stringify(value));
  } catch {
    // Preferences are a convenience only.
  }
}

/** Open notebook: toolbar, page list and the page being edited. `pageNumber` is 1-based. */
export function NotebookPage({
  notebookId,
  pageNumber,
}: {
  notebookId: string;
  pageNumber: number;
}) {
  const state = useNoteState();
  useStoreVersion();
  const notebook = state.notebooks[notebookId];
  const index = notebook ? Math.min(pageNumber, notebook.pageIds.length) - 1 : 0;
  const pageId = notebook?.pageIds[index];
  const page = pageId ? state.pages[pageId] : undefined;

  const [tool, setTool] = useState<Tool>(() => readPref('tool', 'pen'));
  const [pen, setPen] = useState<InkSettings>(() =>
    readPref('pen', { color: INK_COLORS[0], width: PEN_WIDTHS[0] }),
  );
  const [marker, setMarker] = useState<InkSettings>(() =>
    readPref('marker', { color: HIGHLIGHT_COLORS[0], width: HIGHLIGHT_WIDTHS[1] }),
  );
  const [fingerDraw, setFingerDraw] = useState<boolean>(() => readPref('fingerDraw', false));
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(1);
  const [showPages, setShowPages] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<TextDraft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  useEffect(() => writePref('tool', tool), [tool]);
  useEffect(() => writePref('pen', pen), [pen]);
  useEffect(() => writePref('marker', marker), [marker]);
  useEffect(() => writePref('fingerDraw', fingerDraw), [fingerDraw]);
  useEffect(() => setSelectedId(null), [pageId, tool]);

  // Fit page width to the stage; zoom multiplies that.
  const pageWidth = page ? pageSize(page).width : 794;
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setFit(Math.max(0.2, Math.min(1.6, (el.clientWidth - 32) / pageWidth)));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidth]);

  const goTo = useCallback(
    (n: number) => navigate({ name: 'notebook', notebookId, page: n }, true),
    [notebookId],
  );

  // Keyboard: undo / redo, page keys (not while typing in a text box).
  useEffect(() => {
    if (!pageId) return;
    const onKey = (e: KeyboardEvent) => {
      const typing =
        (e.target as HTMLElement)?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) noteStore.redo(pageId);
        else noteStore.undo(pageId);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        noteStore.editItems(pageId, (items) => items.filter((it) => it.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageId, selectedId]);

  // A text box that was being typed when the tab closed (PRD v1.0 §8.2 crash recovery).
  useEffect(() => {
    const d = loadTextDraft();
    setRecovery(d && pageId && d.pageId === pageId && !isBlank(d.html) ? d : null);
  }, [pageId]);

  const restoreDraft = () => {
    if (!recovery || !pageId) return;
    const html = sanitizeHtml(recovery.html);
    noteStore.editItems(pageId, (items) => {
      const existing = recovery.itemId ? items.find((it) => it.id === recovery.itemId) : undefined;
      if (existing && existing.kind === 'text') {
        return items.map((it) => (it.id === existing.id ? { ...existing, html } : it));
      }
      return [
        ...items,
        {
          id: newId('t-'),
          kind: 'text',
          x: recovery.x,
          y: recovery.y,
          width: DEFAULT_TEXT_WIDTH,
          html,
        },
      ];
    });
    clearTextDraft();
    setRecovery(null);
  };

  if (!state.ready) return <p className="notice">Đang mở…</p>;
  if (!notebook || notebook.deletedAt !== null || !page || !pageId) {
    return (
      <div className="library">
        <div className="card empty">
          <p>Không tìm thấy sổ tay này.</p>
          <a className="btn" href={routeHref({ name: 'library' })}>
            Về thư viện
          </a>
        </div>
      </div>
    );
  }

  const total = notebook.pageIds.length;
  const scale = fit * zoom;
  const ink = tool === 'highlighter' ? marker : pen;
  const setInk = tool === 'highlighter' ? setMarker : setPen;
  const colors = tool === 'highlighter' ? HIGHLIGHT_COLORS : INK_COLORS;
  const widths = tool === 'highlighter' ? HIGHLIGHT_WIDTHS : PEN_WIDTHS;
  const selected = selectedId ? page.items.find((it) => it.id === selectedId) : undefined;

  const run = async (label: string, task: () => Promise<void>) => {
    setBusy(label);
    setMessage(null);
    try {
      await task();
    } catch (e) {
      setMessage({
        text:
          e instanceof PdfImportError || e instanceof Error ? e.message : 'Có lỗi, thử lại nhé.',
        error: true,
      });
    } finally {
      setBusy(null);
    }
  };

  const addBlankPage = (template: PageTemplate = page.template) => {
    noteStore.update((s) =>
      addPage(
        s,
        notebookId,
        index + 1,
        newPage(newId('p-'), notebookId, template, Date.now()),
        Date.now(),
      ),
    );
    goTo(index + 2);
  };

  const onExport = (all: boolean) =>
    run('Đang tạo PDF…', async () => {
      const pages = (all ? notebook.pageIds : [pageId])
        .map((id) => state.pages[id]!)
        .filter(Boolean);
      const blob = await exportPdf(pages, (d, t) => setBusy(`Đang tạo PDF… ${d}/${t}`));
      const name = safeFileName(all ? notebook.title : `${notebook.title} - trang ${index + 1}`);
      const result = await shareOrDownload(blob, name);
      if (result === 'downloaded') setMessage({ text: `Đã tải về ${name}.` });
    });

  return (
    <div className="notebook">
      <header className="nb-head">
        <a className="icon-btn" href={routeHref({ name: 'library' })} aria-label="Về thư viện">
          <BackIcon />
        </a>
        <input
          className="nb-title"
          aria-label="Tên sổ tay"
          defaultValue={notebook.title}
          key={notebook.id}
          maxLength={80}
          onBlur={(e) =>
            e.target.value.trim() !== notebook.title &&
            noteStore.update((s) =>
              updateNotebook(s, notebookId, { title: e.target.value }, Date.now()),
            )
          }
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <button
          type="button"
          className={`icon-btn nb-pages-toggle ${showPages ? 'is-on' : ''}`}
          aria-pressed={showPages}
          aria-label="Danh sách trang"
          onClick={() => setShowPages(!showPages)}
        >
          <PagesIcon />
        </button>
        <SaveState />
        <button
          type="button"
          className="btn btn--ghost nb-export"
          disabled={busy !== null}
          onClick={() => void onExport(true)}
        >
          <ShareIcon /> Xuất PDF
        </button>
      </header>

      <div className="toolbar" role="toolbar" aria-label="Công cụ">
        <div className="toolbar__group" role="group" aria-label="Công cụ viết">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tool ${tool === t.id ? 'is-on' : ''}`}
              aria-pressed={tool === t.id}
              aria-label={t.label}
              title={t.label}
              onClick={() => setTool(t.id)}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {(tool === 'pen' || tool === 'highlighter') && (
          <div className="toolbar__group" role="group" aria-label="Màu và độ dày">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className={`ink-swatch ${ink.color === c ? 'is-on' : ''}`}
                style={{ background: c }}
                aria-pressed={ink.color === c}
                aria-label={`Màu ${c}`}
                onClick={() => setInk({ ...ink, color: c })}
              />
            ))}
            {widths.map((w) => (
              <button
                key={w}
                type="button"
                className={`tool width-dot ${ink.width === w ? 'is-on' : ''}`}
                aria-pressed={ink.width === w}
                aria-label={`Độ dày ${w}`}
                onClick={() => setInk({ ...ink, width: w })}
              >
                <span style={{ width: Math.min(22, w + 2), height: Math.min(22, w + 2) }} />
              </button>
            ))}
          </div>
        )}

        {tool === 'text' && (
          <div className="toolbar__group" role="group" aria-label="Định dạng chữ">
            {(
              [
                ['bold', 'B', 'In đậm'],
                ['italic', 'I', 'In nghiêng'],
                ['h2', 'H', 'Tiêu đề'],
                ['insertUnorderedList', '•', 'Danh sách'],
                ['insertOrderedList', '1.', 'Danh sách số'],
                ['checklist', '☑', 'Danh sách việc cần làm'],
                ['quote', '❝', 'Trích dẫn'],
                ['code', '</>', 'Code'],
                ['link', '🔗', 'Liên kết'],
              ] as const
            ).map(([cmd, label, name]) => (
              <button
                key={cmd}
                type="button"
                className={`tool fmt fmt--${cmd}`}
                aria-label={name}
                title={name}
                onPointerDown={(e) => {
                  e.preventDefault();
                  runFormat(cmd);
                }}
              >
                {label}
              </button>
            ))}
            <span className="toolbar__hint">Chạm vào trang để thêm chữ</span>
          </div>
        )}

        {tool === 'select' && (
          <div className="toolbar__group">
            {selected?.kind === 'file' && (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => void openStoredFile(selected.fileId)}
              >
                Mở tệp
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--small"
              disabled={!selected}
              onClick={() => {
                noteStore.editItems(pageId, (items) => items.filter((it) => it.id !== selectedId));
                setSelectedId(null);
              }}
            >
              <TrashIcon /> Xoá mục đã chọn
            </button>
            {!selected && (
              <span className="toolbar__hint">Chạm vào ảnh, chữ hoặc tệp để di chuyển</span>
            )}
          </div>
        )}

        <div className="toolbar__group toolbar__group--end">
          <button
            type="button"
            className="tool"
            aria-label="Hoàn tác"
            title="Hoàn tác"
            disabled={!noteStore.canUndo(pageId)}
            onClick={() => noteStore.undo(pageId)}
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            className="tool"
            aria-label="Làm lại"
            title="Làm lại"
            disabled={!noteStore.canRedo(pageId)}
            onClick={() => noteStore.redo(pageId)}
          >
            <RedoIcon />
          </button>
          <button
            type="button"
            className="tool"
            aria-label="Chèn ảnh"
            title="Chèn ảnh"
            onClick={() => imageInput.current?.click()}
          >
            <ImageIcon />
          </button>
          <button
            type="button"
            className="tool"
            aria-label="Đính kèm tệp"
            title="Đính kèm tệp"
            onClick={() => fileInput.current?.click()}
          >
            <ClipIcon />
          </button>
          <button
            type="button"
            className="tool"
            aria-label="Chèn trang PDF"
            title="Chèn trang PDF"
            onClick={() => pdfInput.current?.click()}
          >
            <PdfIcon />
          </button>
          <button
            type="button"
            className={`tool ${fingerDraw ? 'is-on' : ''}`}
            aria-pressed={fingerDraw}
            aria-label="Vẽ bằng ngón tay"
            title="Vẽ bằng ngón tay"
            onClick={() => setFingerDraw(!fingerDraw)}
          >
            <HandIcon />
          </button>
          <label className="zoom">
            <span className="visually-hidden">Thu phóng</span>
            <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
              {ZOOMS.map((z) => (
                <option key={z} value={z}>
                  {Math.round(z * 100)}%
                </option>
              ))}
            </select>
          </label>
        </div>
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f)
              void run('Đang chèn ảnh…', async () => {
                const id = await attachFile(pageId, f);
                setTool('select');
                setSelectedId(id);
              });
          }}
        />
        <input
          ref={fileInput}
          type="file"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f)
              void run('Đang đính kèm…', async () => {
                await attachFile(pageId, f);
              });
          }}
        />
        <input
          ref={pdfInput}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f)
              void run('Đang nhập PDF…', async () => {
                const r = await insertPdf(f, { notebookId, index: index + 1 }, (d, t) =>
                  setBusy(`Đang nhập trang ${d}/${t}…`),
                );
                goTo(r.firstPage);
              });
          }}
        />
      </div>

      {(busy || message || noteStore.saveError()) && (
        <p
          className={`notice ${message?.error || noteStore.saveError() ? 'notice--error' : ''}`}
          role={message?.error ? 'alert' : 'status'}
        >
          {busy ?? noteStore.saveError() ?? message?.text}
        </p>
      )}

      <div className={`nb-body ${showPages ? 'show-pages' : ''}`}>
        <aside className="thumbs" aria-label="Các trang">
          <ol>
            {notebook.pageIds.map((id, i) => {
              const p = state.pages[id];
              return p ? (
                <li key={id}>
                  <button
                    type="button"
                    className={`thumb ${i === index ? 'is-current' : ''}`}
                    aria-current={i === index ? 'page' : undefined}
                    aria-label={`Trang ${i + 1}`}
                    onClick={() => {
                      goTo(i + 1);
                      setShowPages(false);
                    }}
                  >
                    <PageView page={p} scale={120 / pageSize(p).width} />
                    <span className="thumb__n">{i + 1}</span>
                  </button>
                </li>
              ) : null;
            })}
          </ol>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => addBlankPage()}
          >
            <PlusIcon /> Thêm trang
          </button>
        </aside>

        <main className="stage" ref={stageRef}>
          <PageEditor
            page={page}
            scale={scale}
            tool={tool}
            ink={ink}
            fingerDraw={fingerDraw}
            scrollerRef={stageRef}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <nav className="page-bar" aria-label="Trang">
            <button
              type="button"
              className="icon-btn"
              aria-label="Trang trước"
              disabled={index === 0}
              onClick={() => goTo(index)}
            >
              <ChevronLeftIcon />
            </button>
            <span className="page-bar__n">
              Trang {index + 1}/{total}
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label="Trang sau"
              disabled={index >= total - 1}
              onClick={() => goTo(index + 2)}
            >
              <ChevronRightIcon />
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => addBlankPage()}
            >
              <PlusIcon /> Trang mới
            </button>
            {page.background.kind === 'template' && (
              <label className="zoom">
                <span className="visually-hidden">Loại giấy</span>
                <select
                  value={page.template}
                  onChange={(e) =>
                    noteStore.update((s) =>
                      setPageTemplate(s, pageId, e.target.value as PageTemplate, Date.now()),
                    )
                  }
                >
                  {PAGE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="icon-btn"
              aria-label="Nhân bản trang"
              title="Nhân bản trang"
              onClick={() => {
                noteStore.update((s) =>
                  duplicatePage(s, notebookId, pageId, newId('p-'), Date.now()),
                );
                goTo(index + 2);
              }}
            >
              <CopyIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Chuyển trang lên trước"
              title="Chuyển lên trước"
              disabled={index === 0}
              onClick={() => {
                noteStore.update((s) => movePage(s, notebookId, index, index - 1, Date.now()));
                goTo(index);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Chuyển trang ra sau"
              title="Chuyển ra sau"
              disabled={index >= total - 1}
              onClick={() => {
                noteStore.update((s) => movePage(s, notebookId, index, index + 1, Date.now()));
                goTo(index + 2);
              }}
            >
              ↓
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Xuất trang này ra PDF"
              title="Xuất trang này"
              disabled={busy !== null}
              onClick={() => void onExport(false)}
            >
              <ShareIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Xoá trang"
              title="Xoá trang"
              disabled={total <= 1}
              onClick={() => setConfirmDelete(true)}
            >
              <TrashIcon />
            </button>
          </nav>
          <PageMeta
            pageId={pageId}
            tags={page.tags ?? []}
            notebookId={notebookId}
            canMove={total > 1}
            onMoved={(targetId) => {
              const target = noteStore.getState().notebooks[targetId];
              setMessage({ text: `Đã chuyển trang sang "${target?.title ?? ''}".` });
              goTo(Math.max(1, index));
            }}
          />
          {recovery && (
            <div className="notice notice--card" role="status">
              <span>Có đoạn chữ chưa lưu từ lần trước trên trang này.</span>
              <button type="button" className="btn btn--small" onClick={restoreDraft}>
                Khôi phục
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => {
                  clearTextDraft();
                  setRecovery(null);
                }}
              >
                Bỏ
              </button>
            </div>
          )}
        </main>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`Xoá trang ${index + 1}?`}
          message="Mọi nét viết, chữ và ảnh trên trang này sẽ bị xoá. Không thể hoàn tác."
          confirmLabel="Xoá trang"
          onConfirm={() => {
            noteStore.update((s) => removePage(s, notebookId, pageId, Date.now()));
            setConfirmDelete(false);
            goTo(Math.max(1, index));
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

/** Apply a text format to the text box being edited. */
function runFormat(cmd: string): void {
  const root = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(
    '[contenteditable="true"]',
  );
  switch (cmd) {
    case 'h2': {
      const inHeading = document.queryCommandValue('formatBlock').toLowerCase() === 'h2';
      document.execCommand('formatBlock', false, inHeading ? 'p' : 'h2');
      break;
    }
    case 'quote': {
      const inQuote = document.queryCommandValue('formatBlock').toLowerCase() === 'blockquote';
      document.execCommand('formatBlock', false, inQuote ? 'p' : 'blockquote');
      break;
    }
    case 'code': {
      const inCode = document.queryCommandValue('formatBlock').toLowerCase() === 'pre';
      document.execCommand('formatBlock', false, inCode ? 'p' : 'pre');
      break;
    }
    case 'checklist':
      if (root) toggleChecklistAtSelection(root);
      break;
    case 'link': {
      const href = safeHref(window.prompt('Địa chỉ liên kết (https://…)') ?? '');
      if (href) document.execCommand('createLink', false, href);
      break;
    }
    default:
      document.execCommand(cmd);
  }
  root?.dispatchEvent(new Event('input', { bubbles: true }));
}
