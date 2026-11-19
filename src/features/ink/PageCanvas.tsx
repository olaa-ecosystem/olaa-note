import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  type InkPoint,
  type Page,
  type PaperStyle,
  type PlacedImage,
  type Stroke,
} from '../../types/note';
import { createId } from '../../utils/id';
import { compactPoints, eraseAt, thinPoints } from './geometry';
import { drawPaper, drawStroke, drawStrokeTail } from './render';

export type EditorTool = 'pen' | 'highlighter' | 'eraser' | 'select';

export interface ToolSettings {
  tool: EditorTool;
  color: string;
  width: number;
  highlighterColor: string;
  eraserSize: number;
  penOnly: boolean;
}

interface Props {
  page: Page;
  paper: PaperStyle;
  scale: number;
  settings: ToolSettings;
  onCommit: (page: Page) => void;
}

function setupCanvas(canvas: HTMLCanvasElement, scale: number): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(PAGE_WIDTH * scale * dpr);
  canvas.height = Math.round(PAGE_HEIGHT * scale * dpr);
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  return ctx;
}

export function PageCanvas({ page, paper, scale, settings, onCommit }: Props) {
  const paperRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ stroke: Stroke; pointerId: number } | null>(null);
  const erasing = useRef<{ strokes: Stroke[]; pointerId: number } | null>(null);
  const [eraserPos, setEraserPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dragImage, setDragImage] = useState<PlacedImage | null>(null);

  const redrawInk = (strokes: Stroke[]) => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, scale);
    if (!ctx) return;
    for (const s of strokes) drawStroke(ctx, s);
  };

  useEffect(() => {
    const canvas = paperRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, scale);
    if (ctx) drawPaper(ctx, paper);
  }, [paper, scale]);

  useEffect(() => {
    redrawInk(page.strokes);
    const live = liveRef.current;
    if (live) setupCanvas(live, scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.strokes, scale]);

  useEffect(() => {
    if (settings.tool !== 'select') setSelectedImage(null);
  }, [settings.tool]);

  const toPagePoint = (e: PointerEvent | ReactPointerEvent): InkPoint => {
    const rect = liveRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * PAGE_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * PAGE_HEIGHT;
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    return [x, y, pressure];
  };

  const ignore = (e: ReactPointerEvent) =>
    (settings.penOnly && e.pointerType === 'touch') || (e.pointerType === 'mouse' && e.button !== 0);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (ignore(e) || drawing.current || erasing.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toPagePoint(e);
    if (settings.tool === 'eraser') {
      const strokes = eraseAt(page.strokes, pt[0], pt[1], settings.eraserSize);
      erasing.current = { strokes, pointerId: e.pointerId };
      if (strokes !== page.strokes) redrawInk(strokes);
      setEraserPos({ x: pt[0], y: pt[1] });
      return;
    }
    if (settings.tool === 'pen' || settings.tool === 'highlighter') {
      const isHl = settings.tool === 'highlighter';
      drawing.current = {
        pointerId: e.pointerId,
        stroke: {
          id: createId(),
          tool: settings.tool,
          color: isHl ? settings.highlighterColor : settings.color,
          width: isHl ? Math.max(14, settings.width * 6) : settings.width,
          points: [pt],
        },
      };
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (settings.tool === 'eraser' && !ignore(e)) {
      const pt = toPagePoint(e);
      setEraserPos({ x: pt[0], y: pt[1] });
      const er = erasing.current;
      if (er && er.pointerId === e.pointerId) {
        const next = eraseAt(er.strokes, pt[0], pt[1], settings.eraserSize);
        if (next !== er.strokes) {
          er.strokes = next;
          redrawInk(next);
        }
      }
      return;
    }
    const d = drawing.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const native = e.nativeEvent;
    const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const from = d.stroke.points.length;
    for (const ev of events.length ? events : [native]) d.stroke.points.push(toPagePoint(ev));
    const live = liveRef.current;
    const ctx = live?.getContext('2d');
    if (!ctx || !live) return;
    if (d.stroke.tool === 'highlighter') {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, live.width, live.height);
      ctx.restore();
      drawStroke(ctx, d.stroke);
    } else {
      drawStrokeTail(ctx, d.stroke, from);
    }
  };

  const finish = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const er = erasing.current;
    if (er && er.pointerId === e.pointerId) {
      erasing.current = null;
      if (er.strokes !== page.strokes) onCommit({ ...page, strokes: er.strokes });
      return;
    }
    const d = drawing.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drawing.current = null;
    const live = liveRef.current;
    if (live) {
      const ctx = live.getContext('2d');
      ctx?.save();
      ctx?.setTransform(1, 0, 0, 1, 0, 0);
      ctx?.clearRect(0, 0, live.width, live.height);
      ctx?.restore();
    }
    const stroke: Stroke = { ...d.stroke, points: compactPoints(thinPoints(d.stroke.points)) };
    // Draw immediately so there is no flicker before React re-renders.
    const inkCtx = inkRef.current?.getContext('2d');
    if (inkCtx) drawStroke(inkCtx, stroke);
    onCommit({ ...page, strokes: [...page.strokes, stroke] });
  };

  // ---- Image manipulation (select tool) ----
  const startImageDrag = (
    e: ReactPointerEvent<HTMLElement>,
    image: PlacedImage,
    mode: 'move' | 'resize',
  ) => {
    if (settings.tool !== 'select') return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedImage(image.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const aspect = image.h / image.w;
    let current = image;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      if (mode === 'move') {
        current = { ...image, x: image.x + dx, y: image.y + dy };
      } else {
        const w = Math.max(40, image.w + dx);
        current = { ...image, w, h: w * aspect };
      }
      setDragImage(current);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDragImage(null);
      if (current !== image) {
        onCommit({ ...page, images: page.images.map((im) => (im.id === image.id ? current : im)) });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const deleteImage = (id: string) => {
    setSelectedImage(null);
    onCommit({ ...page, images: page.images.filter((im) => im.id !== id) });
  };

  const w = PAGE_WIDTH * scale;
  const h = PAGE_HEIGHT * scale;
  const inkMode = settings.tool !== 'select';

  return (
    <div
      className="page-surface"
      style={{ width: w, height: h }}
      onPointerDown={() => settings.tool === 'select' && setSelectedImage(null)}
    >
      <canvas ref={paperRef} className="page-layer" style={{ width: w, height: h }} aria-hidden />
      <div className="page-layer">
        {page.images.map((orig) => {
          const im = dragImage?.id === orig.id ? dragImage : orig;
          const selected = selectedImage === im.id;
          return (
            <div
              key={im.id}
              className={`page-image${selected ? ' is-selected' : ''}${inkMode ? '' : ' is-editable'}`}
              style={{ left: im.x * scale, top: im.y * scale, width: im.w * scale, height: im.h * scale }}
              onPointerDown={(e) => startImageDrag(e, orig, 'move')}
            >
              <img src={im.src} alt="" draggable={false} />
              {selected && (
                <>
                  <button
                    type="button"
                    className="image-delete"
                    aria-label="Xoá ảnh"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => deleteImage(im.id)}
                  >
                    ×
                  </button>
                  <span
                    className="image-resize"
                    aria-hidden
                    onPointerDown={(e) => startImageDrag(e, orig, 'resize')}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
      <canvas ref={inkRef} className="page-layer no-events" style={{ width: w, height: h }} aria-hidden />
      <canvas
        ref={liveRef}
        className={`page-layer ink-input${inkMode ? '' : ' no-events'}${settings.tool === 'eraser' ? ' is-eraser' : ''}`}
        style={{ width: w, height: h }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onPointerLeave={() => setEraserPos(null)}
        role="img"
        aria-label="Trang viết tay"
      />
      {settings.tool === 'eraser' && eraserPos && (
        <div
          className="eraser-cursor"
          style={{
            left: (eraserPos.x - settings.eraserSize) * scale,
            top: (eraserPos.y - settings.eraserSize) * scale,
            width: settings.eraserSize * 2 * scale,
            height: settings.eraserSize * 2 * scale,
          }}
        />
      )}
    </div>
  );
}
