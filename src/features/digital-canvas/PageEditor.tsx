import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { noteStore } from '../../stores/noteStore';
import { newId } from '../../utils/id';
import { HIGHLIGHT_OPACITY, strokePath } from '../inking-tools/strokePath';
import { pageSize, type Page } from '../page-management/types';
import { isBlank, sanitizeHtml } from '../rich-text-editor/richText';
import { DEFAULT_TEXT_WIDTH } from '../rich-text-editor/textStyle';
import {
  eraseAt,
  roundPoint,
  simplifyPoints,
  type Item,
  type Stroke,
  type StrokePoint,
  type TextBox,
} from './items';
import { FileCard, ImageView, InkLayer, itemBox, Paper, StaticText } from './layers';

export type Tool = 'pen' | 'highlighter' | 'eraser' | 'text' | 'select';

export interface InkSettings {
  color: string;
  width: number;
}

const ERASER_RADIUS = 10;
const MIN_ITEM_SIZE = 40;

interface Props {
  page: Page;
  scale: number;
  tool: Tool;
  ink: InkSettings;
  /** Let fingers draw. Off by default so a resting palm or finger scrolls instead (REQ-03-013). */
  fingerDraw: boolean;
  scrollerRef: RefObject<HTMLElement>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * One editable page (modules 03.04–03.06, REQ-03-010…015). Everything is stored in page units;
 * the page is drawn at `scale` with a CSS transform.
 */
export function PageEditor({
  page,
  scale,
  tool,
  ink,
  fingerDraw,
  scrollerRef,
  selectedId,
  onSelect,
}: Props) {
  const { width, height } = pageSize(page);
  const overlayRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const gesture = useRef<
    | { kind: 'draw'; id: number; points: StrokePoint[] }
    | { kind: 'erase'; id: number; items: Item[] }
    | { kind: 'pan'; id: number; x: number; y: number }
    | null
  >(null);
  const frame = useRef(0);
  const [erasing, setErasing] = useState<Item[] | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number; dw: number } | null>(null);

  const items = erasing ?? page.items;
  const inkTool = tool === 'pen' || tool === 'highlighter' || tool === 'eraser';
  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);

  useEffect(() => {
    if (tool !== 'text') {
      setDraft(null);
      setEditingId(null);
    }
  }, [tool]);

  useLayoutEffect(() => {
    const canvas = liveRef.current;
    if (!canvas) return;
    canvas.width = Math.round(width * scale * dpr);
    canvas.height = Math.round(height * scale * dpr);
  }, [width, height, scale, dpr]);

  const toPage = (e: { clientX: number; clientY: number }): [number, number] => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return [(e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale];
  };

  const drawLive = () => {
    frame.current = 0;
    const g = gesture.current;
    const canvas = liveRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!g || g.kind !== 'draw') return;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.globalAlpha = tool === 'highlighter' ? HIGHLIGHT_OPACITY : 1;
    ctx.fillStyle = ink.color;
    ctx.fill(
      new Path2D(
        strokePath(
          {
            points: g.points,
            width: ink.width,
            tool: tool === 'highlighter' ? 'highlighter' : 'pen',
          },
          false,
        ),
      ),
    );
  };
  const scheduleDraw = () => {
    if (!frame.current) frame.current = requestAnimationFrame(drawLive);
  };

  const pointOf = (e: PointerEvent | React.PointerEvent): StrokePoint => {
    const [x, y] = toPage(e);
    const pressure = e.pointerType === 'pen' ? Math.max(0.05, e.pressure || 0.5) : 0.5;
    return [x, y, pressure];
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current) return;
    if (e.pointerType === 'touch' && !fingerDraw) {
      gesture.current = { kind: 'pan', id: e.pointerId, x: e.clientX, y: e.clientY };
      capture(e.currentTarget, e.pointerId);
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    capture(e.currentTarget, e.pointerId);
    if (tool === 'eraser') {
      const [x, y] = toPage(e);
      const next = eraseAt(page.items, x, y, ERASER_RADIUS / Math.min(1, scale));
      gesture.current = { kind: 'erase', id: e.pointerId, items: next };
      setErasing(next);
    } else {
      gesture.current = { kind: 'draw', id: e.pointerId, points: [pointOf(e)] };
      scheduleDraw();
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    if (g.kind === 'pan') {
      scrollerRef.current?.scrollBy(g.x - e.clientX, g.y - e.clientY);
      g.x = e.clientX;
      g.y = e.clientY;
      return;
    }
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const samples = events.length > 0 ? events : [e.nativeEvent];
    if (g.kind === 'draw') {
      for (const s of samples) g.points.push(pointOf(s));
      scheduleDraw();
    } else {
      let next = g.items;
      for (const s of samples) {
        const [x, y] = toPage(s);
        next = eraseAt(next, x, y, ERASER_RADIUS / Math.min(1, scale));
      }
      if (next !== g.items) {
        g.items = next;
        setErasing(next);
      }
    }
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.kind === 'draw') {
      const stroke: Stroke = {
        id: newId('s-'),
        kind: 'stroke',
        tool: tool === 'highlighter' ? 'highlighter' : 'pen',
        color: ink.color,
        width: ink.width,
        points: simplifyPoints(g.points).map(roundPoint),
      };
      noteStore.editItems(page.id, (list) => [...list, stroke]);
      requestAnimationFrame(drawLive);
    } else if (g.kind === 'erase') {
      const result = g.items;
      setErasing(null);
      noteStore.editItems(page.id, (list) => (result === page.items ? list : result));
    }
  };

  const onPaperPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      e.target !== e.currentTarget &&
      !(e.target as HTMLElement).classList.contains('paper__bg') &&
      !(e.target as HTMLElement).classList.contains('paper__pdf')
    )
      return;
    if (tool === 'select') onSelect(null);
    if (tool !== 'text') return;
    if (editingId || draft) {
      (document.activeElement as HTMLElement | null)?.blur();
      return;
    }
    const [x, y] = toPage(e);
    e.preventDefault();
    setDraft({ x: Math.max(0, Math.min(x - 8, width - 120)), y: Math.max(0, y - 14) });
  };

  const saveText = (id: string | null, html: string, at?: { x: number; y: number }) => {
    const clean = sanitizeHtml(html);
    if (id === null) {
      setDraft(null);
      if (isBlank(clean) || !at) return;
      const box: TextBox = {
        id: newId('t-'),
        kind: 'text',
        x: at.x,
        y: at.y,
        width: Math.min(DEFAULT_TEXT_WIDTH, width - at.x),
        html: clean,
      };
      noteStore.editItems(page.id, (list) => [...list, box]);
      return;
    }
    setEditingId(null);
    noteStore.editItems(page.id, (list) => {
      const current = list.find((it) => it.id === id);
      if (!current || current.kind !== 'text') return list;
      if (isBlank(clean)) return list.filter((it) => it.id !== id);
      return current.html === clean
        ? list
        : list.map((it) => (it.id === id ? { ...current, html: clean } : it));
    });
  };

  const startDrag = (
    e: React.PointerEvent,
    item: Exclude<Item, Stroke>,
    mode: 'move' | 'resize',
  ) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(item.id);
    const target = e.currentTarget as HTMLElement;
    capture(target, e.pointerId);
    const start = { x: e.clientX, y: e.clientY };
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - start.x) / scale;
      const dy = (ev.clientY - start.y) / scale;
      setDrag(
        mode === 'move' ? { id: item.id, dx, dy, dw: 0 } : { id: item.id, dx: 0, dy: 0, dw: dx },
      );
    };
    const up = (ev: PointerEvent) => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      setDrag(null);
      const dx = (ev.clientX - start.x) / scale;
      const dy = (ev.clientY - start.y) / scale;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      noteStore.editItems(page.id, (list) =>
        list.map((it) =>
          it.id === item.id
            ? applyDrag(
                it,
                mode === 'move' ? { dx, dy, dw: 0 } : { dx: 0, dy: 0, dw: dx },
                width,
                height,
              )
            : it,
        ),
      );
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  return (
    <div
      className="paper-frame paper-frame--editor"
      style={{ width: width * scale, height: height * scale }}
    >
      <div
        className={`paper tool-${tool}`}
        style={{ width, height, transform: `scale(${scale})` }}
        onPointerDown={onPaperPointerDown}
        data-testid="page-editor"
      >
        <Paper page={page} />
        {items.map((it) => {
          if (it.kind === 'stroke') return null;
          const shown = (drag?.id === it.id ? applyDrag(it, drag, width, height) : it) as Exclude<
            Item,
            Stroke
          >;
          const selected = tool === 'select' && selectedId === it.id;
          const editable = tool === 'text' && it.kind === 'text';
          return (
            <div
              key={it.id}
              className={`item ${selected ? 'is-selected' : ''} ${tool === 'select' ? 'is-movable' : ''}`}
              style={itemBox(shown)}
              onPointerDown={(e) => startDrag(e, it, 'move')}
            >
              {it.kind === 'image' ? (
                <ImageView item={shown as typeof it} />
              ) : it.kind === 'file' ? (
                <FileCard item={it} />
              ) : editable ? (
                <TextEditor
                  html={it.html}
                  autoFocus={editingId === it.id}
                  onFocus={() => setEditingId(it.id)}
                  onDone={(html) => saveText(it.id, html)}
                />
              ) : (
                <StaticText item={it} />
              )}
              {selected && (it.kind === 'image' || it.kind === 'text') && (
                <span
                  className="resize-handle"
                  aria-hidden
                  onPointerDown={(e) => startDrag(e, it, 'resize')}
                />
              )}
            </div>
          );
        })}
        {draft && (
          <div
            className="item"
            style={{
              left: draft.x,
              top: draft.y,
              width: Math.min(DEFAULT_TEXT_WIDTH, width - draft.x),
            }}
          >
            <TextEditor html="" autoFocus onDone={(html) => saveText(null, html, draft)} />
          </div>
        )}
        <InkLayer items={items} width={width} height={height} />
        <canvas ref={liveRef} className="ink-live" style={{ width, height }} aria-hidden />
        <div
          ref={overlayRef}
          className={`ink-input ${inkTool ? 'is-active' : ''} ${tool === 'eraser' ? 'is-eraser' : ''}`}
          onPointerDown={inkTool ? onPointerDown : undefined}
          onPointerMove={inkTool ? onPointerMove : undefined}
          onPointerUp={inkTool ? onPointerEnd : undefined}
          onPointerCancel={inkTool ? onPointerEnd : undefined}
          aria-label={inkTool ? 'Vùng viết tay' : undefined}
        />
      </div>
    </div>
  );
}

/** Keep receiving a pointer's events outside the element; harmless if the browser refuses. */
function capture(el: Element, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // Not an active pointer (e.g. synthetic events): moves still arrive while over the page.
  }
}

function applyDrag(
  item: Item,
  d: { dx: number; dy: number; dw: number },
  pageW: number,
  pageH: number,
): Item {
  if (item.kind === 'stroke') return item;
  const x = Math.round(Math.max(0, Math.min(item.x + d.dx, pageW - MIN_ITEM_SIZE)));
  const y = Math.round(Math.max(0, Math.min(item.y + d.dy, pageH - MIN_ITEM_SIZE)));
  if (item.kind === 'image') {
    const w = Math.round(Math.max(MIN_ITEM_SIZE, Math.min(item.width + d.dw, pageW - x)));
    return { ...item, x, y, width: w, height: Math.round((item.height * w) / item.width) };
  }
  if (item.kind === 'text') {
    return {
      ...item,
      x,
      y,
      width: Math.round(Math.max(120, Math.min(item.width + d.dw, pageW - x))),
    };
  }
  return { ...item, x, y };
}

/** A contentEditable text box; saves (sanitised by the caller) when it loses focus. */
function TextEditor({
  html,
  autoFocus,
  onFocus,
  onDone,
}: {
  html: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onDone: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.innerHTML = html;
    // Only on mount: while editing, the DOM is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div
      ref={ref}
      className="item-text is-editing"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Khung chữ"
      onFocus={onFocus}
      onBlur={() => onDone(ref.current?.innerHTML ?? '')}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
}
