import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PAGE_WIDTH, type Notebook, type Page, type PaperStyle } from '../../types/note';
import { useStore } from '../../app/context';
import type { SaveStatus } from '../../stores/libraryStore';
import { navigate } from '../../hooks/useHashRoute';
import { Icon, type IconName } from '../../components/Icon';
import { SaveIndicator } from '../../components/SaveIndicator';
import { TagEditor } from '../../components/TagEditor';
import { createPage } from '../../utils/documents';
import { createId } from '../../utils/id';
import { PageCanvas, type EditorTool, type ToolSettings } from '../ink/PageCanvas';
import { PageThumbnail } from '../ink/PageThumbnail';
import { exportPagePng, fileToImageData } from '../ink/pageRenderer';
import { PAPERS } from '../library/NewNotebookDialog';
import { PageHistory } from './history';

const PEN_COLORS = ['#1d1d1f', '#2f5bd3', '#d23b3b', '#1f8a4c', '#8a3fd1', '#e07b00'];
const HIGHLIGHT_COLORS = ['#ffe14d', '#7df0a0', '#ffa3c7', '#8fd3ff'];
const WIDTHS = [1.5, 2.5, 4, 7];

const TOOLS: { id: EditorTool; label: string; icon: IconName; key: string }[] = [
  { id: 'pen', label: 'Bút', icon: 'pen', key: 'p' },
  { id: 'highlighter', label: 'Bút dạ quang', icon: 'highlighter', key: 'h' },
  { id: 'eraser', label: 'Tẩy', icon: 'eraser', key: 'e' },
  { id: 'select', label: 'Chọn / di chuyển ảnh', icon: 'hand', key: 'v' },
];

function loadSettings(): ToolSettings {
  const defaults: ToolSettings = {
    tool: 'pen',
    color: PEN_COLORS[0],
    width: WIDTHS[1],
    highlighterColor: HIGHLIGHT_COLORS[0],
    eraserSize: 12,
    penOnly: false,
  };
  try {
    const raw = localStorage.getItem('olaa-note:tools');
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<ToolSettings>) } : defaults;
  } catch {
    return defaults;
  }
}

interface Props {
  doc: Notebook;
  saveStatus: SaveStatus;
}

export function NotebookEditor({ doc, saveStatus }: Props) {
  const store = useStore();
  const [pageIndex, setPageIndex] = useState(0);
  const [settings, setSettings] = useState<ToolSettings>(loadSettings);
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(0.8);
  const [showPages, setShowPages] = useState(() => window.innerWidth > 900);
  const [showInfo, setShowInfo] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const history = useRef(new PageHistory());
  const [, forceRender] = useState(0);

  const safeIndex = Math.min(pageIndex, doc.pages.length - 1);
  const page = doc.pages[safeIndex];
  const scale = fitScale * zoom;

  useEffect(() => {
    try {
      localStorage.setItem('olaa-note:tools', JSON.stringify(settings));
    } catch {
      // per-device preference only; ignore storage failures
    }
  }, [settings]);

  // Fit page width to the stage.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const available = el.clientWidth - 32;
      setFitScale(Math.max(0.3, Math.min(1.25, available / PAGE_WIDTH)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const replacePage = useCallback(
    (next: Page) => {
      store.update<Notebook>(doc.id, (d) => ({
        ...d,
        pages: d.pages.map((p) => (p.id === next.id ? next : p)),
      }));
    },
    [store, doc.id],
  );

  const commit = useCallback(
    (next: Page) => {
      history.current.record(page);
      replacePage(next);
      forceRender((n) => n + 1);
    },
    [page, replacePage],
  );

  const undo = useCallback(() => {
    const prev = history.current.undo(page);
    if (prev) replacePage(prev);
    forceRender((n) => n + 1);
  }, [page, replacePage]);

  const redo = useCallback(() => {
    const next = history.current.redo(page);
    if (next) replacePage(next);
    forceRender((n) => n + 1);
  }, [page, replacePage]);

  const setTool = (tool: EditorTool) => setSettings((s) => ({ ...s, tool }));

  const addPage = () => {
    const p = createPage();
    store.update<Notebook>(doc.id, (d) => {
      const pages = [...d.pages];
      pages.splice(safeIndex + 1, 0, p);
      return { ...d, pages };
    });
    setPageIndex(safeIndex + 1);
  };

  const duplicatePage = () => {
    const copy: Page = {
      id: createId(),
      strokes: page.strokes.map((s) => ({ ...s, id: createId() })),
      images: page.images.map((im) => ({ ...im, id: createId() })),
    };
    store.update<Notebook>(doc.id, (d) => {
      const pages = [...d.pages];
      pages.splice(safeIndex + 1, 0, copy);
      return { ...d, pages };
    });
    setPageIndex(safeIndex + 1);
  };

  const deletePage = () => {
    if (doc.pages.length === 1) {
      if (!confirm('Xoá toàn bộ nội dung trang này?')) return;
      commit({ ...page, strokes: [], images: [] });
      return;
    }
    if (!confirm(`Xoá trang ${safeIndex + 1}?`)) return;
    store.update<Notebook>(doc.id, (d) => ({ ...d, pages: d.pages.filter((p) => p.id !== page.id) }));
    history.current.forget(page.id);
    setPageIndex(Math.max(0, safeIndex - 1));
  };

  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= doc.pages.length) return;
    store.update<Notebook>(doc.id, (d) => {
      const pages = [...d.pages];
      const [moved] = pages.splice(from, 1);
      pages.splice(to, 0, moved);
      return { ...d, pages };
    });
    setPageIndex(to);
  };

  const insertImage = async (file: File) => {
    const { src, width, height } = await fileToImageData(file);
    const maxW = PAGE_WIDTH * 0.6;
    const w = Math.min(maxW, width);
    const h = (height / width) * w;
    commit({
      ...page,
      images: [...page.images, { id: createId(), src, x: (PAGE_WIDTH - w) / 2, y: 140, w, h }],
    });
    setTool('select');
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (!mod && (e.key === 'ArrowRight' || e.key === 'PageDown')) {
        setPageIndex((i) => Math.min(doc.pages.length - 1, i + 1));
      } else if (!mod && (e.key === 'ArrowLeft' || e.key === 'PageUp')) {
        setPageIndex((i) => Math.max(0, i - 1));
      } else if (!mod) {
        const t = TOOLS.find((x) => x.key === e.key.toLowerCase());
        if (t) setTool(t.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, doc.pages.length]);

  const isInk = settings.tool === 'pen' || settings.tool === 'highlighter';

  return (
    <div className="editor-shell notebook-editor">
      <header className="editor-topbar">
        <button className="icon-btn" aria-label="Về thư viện" onClick={() => navigate({ name: 'library' })}>
          <Icon name="back" />
        </button>
        <button
          className={`icon-btn${showPages ? ' is-on' : ''}`}
          aria-label="Hiện danh sách trang"
          aria-pressed={showPages}
          onClick={() => setShowPages((v) => !v)}
        >
          <Icon name="page" />
        </button>
        <input
          className="title-input"
          value={doc.title}
          aria-label="Tên sổ tay"
          onChange={(e) => store.update<Notebook>(doc.id, (d) => ({ ...d, title: e.target.value }))}
        />
        <SaveIndicator status={saveStatus} />
        <button className={`icon-btn${showInfo ? ' is-on' : ''}`} aria-label="Thẻ và mẫu giấy" onClick={() => setShowInfo((v) => !v)}>
          <Icon name="tag" />
        </button>
        <button
          className="icon-btn"
          aria-label="Xuất trang thành ảnh PNG"
          title="Xuất trang (PNG)"
          onClick={() => void exportPagePng(page, doc.paper, `${doc.title || 'trang'}-${safeIndex + 1}.png`)}
        >
          <Icon name="download" />
        </button>
        <button
          className="icon-btn"
          aria-label="Chuyển vào thùng rác"
          onClick={() => {
            if (!confirm('Chuyển sổ tay này vào thùng rác?')) return;
            store.trash(doc.id);
            navigate({ name: 'library' });
          }}
        >
          <Icon name="trash" />
        </button>
      </header>

      <div className="ink-toolbar" role="toolbar" aria-label="Công cụ viết">
        <div className="tool-group">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`tool-btn${settings.tool === t.id ? ' is-active' : ''}`}
              title={`${t.label} (${t.key.toUpperCase()})`}
              aria-label={t.label}
              aria-pressed={settings.tool === t.id}
              onClick={() => setTool(t.id)}
            >
              <Icon name={t.icon} />
            </button>
          ))}
        </div>

        {isInk && (
          <div className="tool-group">
            {(settings.tool === 'highlighter' ? HIGHLIGHT_COLORS : PEN_COLORS).map((c) => {
              const active = settings.tool === 'highlighter' ? settings.highlighterColor === c : settings.color === c;
              return (
                <button
                  key={c}
                  className={`color-dot${active ? ' is-active' : ''}`}
                  style={{ background: c }}
                  aria-label={`Màu ${c}`}
                  aria-pressed={active}
                  onClick={() =>
                    setSettings((s) => (s.tool === 'highlighter' ? { ...s, highlighterColor: c } : { ...s, color: c }))
                  }
                />
              );
            })}
            {settings.tool === 'pen' && (
              <label className="color-custom" title="Màu tuỳ chọn">
                <input
                  type="color"
                  value={settings.color}
                  onChange={(e) => setSettings((s) => ({ ...s, color: e.target.value }))}
                  aria-label="Chọn màu tuỳ ý"
                />
              </label>
            )}
          </div>
        )}

        {isInk && (
          <div className="tool-group">
            {WIDTHS.map((w) => (
              <button
                key={w}
                className={`width-btn${settings.width === w ? ' is-active' : ''}`}
                aria-label={`Nét ${w}`}
                aria-pressed={settings.width === w}
                onClick={() => setSettings((s) => ({ ...s, width: w }))}
              >
                <span style={{ width: Math.min(18, w * 2.4 + 2), height: Math.min(18, w * 2.4 + 2) }} />
              </button>
            ))}
          </div>
        )}

        {settings.tool === 'eraser' && (
          <div className="tool-group">
            <label className="range">
              Cỡ tẩy
              <input
                type="range"
                min={4}
                max={40}
                value={settings.eraserSize}
                onChange={(e) => setSettings((s) => ({ ...s, eraserSize: Number(e.target.value) }))}
              />
            </label>
          </div>
        )}

        <div className="tool-group">
          <button className="tool-btn" title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác" disabled={!history.current.canUndo(page.id)} onClick={undo}>
            <Icon name="undo" />
          </button>
          <button className="tool-btn" title="Làm lại (Ctrl+Shift+Z)" aria-label="Làm lại" disabled={!history.current.canRedo(page.id)} onClick={redo}>
            <Icon name="redo" />
          </button>
          <button className="tool-btn" title="Chèn ảnh" aria-label="Chèn ảnh" onClick={() => imageInput.current?.click()}>
            <Icon name="image" />
          </button>
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void insertImage(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="tool-group push-right">
          <button
            className={`tool-btn text${settings.penOnly ? ' is-active' : ''}`}
            title="Chỉ vẽ bằng bút stylus (bỏ qua ngón tay / lòng bàn tay)"
            aria-pressed={settings.penOnly}
            onClick={() => setSettings((s) => ({ ...s, penOnly: !s.penOnly }))}
          >
            Chỉ bút
          </button>
          <button className="tool-btn" aria-label="Thu nhỏ" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}>
            <Icon name="zoomOut" />
          </button>
          <button className="tool-btn text" title="Vừa khung" onClick={() => setZoom(1)}>
            {Math.round(zoom * 100)}%
          </button>
          <button className="tool-btn" aria-label="Phóng to" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}>
            <Icon name="zoomIn" />
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="info-panel">
          <TagEditor tags={doc.tags} onChange={(tags) => store.update(doc.id, (d) => ({ ...d, tags }))} />
          <div className="segmented" role="group" aria-label="Mẫu giấy">
            {PAPERS.map((p) => (
              <button
                key={p.value}
                className={doc.paper === p.value ? 'is-active' : ''}
                aria-pressed={doc.paper === p.value}
                onClick={() => store.update<Notebook>(doc.id, (d) => ({ ...d, paper: p.value as PaperStyle }))}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="notebook-body">
        {showPages && (
          <aside className="page-strip" aria-label="Các trang">
            <ol>
              {doc.pages.map((p, i) => (
                <li key={p.id}>
                  <button
                    className={`page-thumb${i === safeIndex ? ' is-active' : ''}`}
                    onClick={() => setPageIndex(i)}
                    aria-label={`Trang ${i + 1}`}
                    aria-current={i === safeIndex ? 'page' : undefined}
                  >
                    <PageThumbnail page={p} paper={doc.paper} width={96} />
                    <span>{i + 1}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="page-strip-actions">
              <button className="tool-btn" title="Thêm trang sau trang này" aria-label="Thêm trang" onClick={addPage}>
                <Icon name="pageAdd" />
              </button>
              <button className="tool-btn text" title="Nhân bản trang" onClick={duplicatePage}>
                ⧉
              </button>
              <button className="tool-btn" title="Chuyển trang lên" aria-label="Chuyển trang lên" disabled={safeIndex === 0} onClick={() => movePage(safeIndex, safeIndex - 1)}>
                <Icon name="chevronLeft" />
              </button>
              <button
                className="tool-btn"
                title="Chuyển trang xuống"
                aria-label="Chuyển trang xuống"
                disabled={safeIndex === doc.pages.length - 1}
                onClick={() => movePage(safeIndex, safeIndex + 1)}
              >
                <Icon name="chevronRight" />
              </button>
              <button className="tool-btn danger" title="Xoá trang" aria-label="Xoá trang" onClick={deletePage}>
                <Icon name="pageDel" />
              </button>
            </div>
          </aside>
        )}

        <div className="stage" ref={stageRef}>
          <div className="stage-inner">
            <PageCanvas key={page.id} page={page} paper={doc.paper} scale={scale} settings={settings} onCommit={commit} />
          </div>
          <nav className="page-nav" aria-label="Chuyển trang">
            <button className="icon-btn" aria-label="Trang trước" disabled={safeIndex === 0} onClick={() => setPageIndex(safeIndex - 1)}>
              <Icon name="chevronLeft" />
            </button>
            <span>
              {safeIndex + 1} / {doc.pages.length}
            </span>
            {safeIndex === doc.pages.length - 1 ? (
              <button className="icon-btn" aria-label="Thêm trang mới" title="Thêm trang mới" onClick={addPage}>
                <Icon name="plus" />
              </button>
            ) : (
              <button className="icon-btn" aria-label="Trang sau" onClick={() => setPageIndex(safeIndex + 1)}>
                <Icon name="chevronRight" />
              </button>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
