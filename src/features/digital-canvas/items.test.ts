import { emptyHistory, record, redo, undo } from '../history-recovery/history';
import { eraseAt, simplifyPoints, strokeHit, type Item, type Stroke } from './items';

const line: Stroke = {
  id: 'a',
  kind: 'stroke',
  tool: 'pen',
  color: '#000',
  width: 4,
  points: [
    [0, 0, 0.5],
    [100, 0, 0.5],
  ],
};
const text: Item = { id: 't', kind: 'text', x: 0, y: 0, width: 100, html: 'hi' };

describe('eraser', () => {
  it('hits strokes near their path only', () => {
    expect(strokeHit(line, 50, 5, 4)).toBe(true);
    expect(strokeHit(line, 50, 20, 4)).toBe(false);
    expect(strokeHit(line, 110, 0, 4)).toBe(false);
  });

  it('removes hit strokes, never other items, and keeps identity on a miss', () => {
    const items = [line, text];
    expect(eraseAt(items, 50, 1, 4)).toEqual([text]);
    expect(eraseAt(items, 50, 80, 4)).toBe(items);
  });

  it('simplifies dense points but keeps the ends', () => {
    const pts = Array.from({ length: 50 }, (_, i) => [i * 0.1, 0, 0.5] as [number, number, number]);
    const out = simplifyPoints(pts);
    expect(out.length).toBeLessThan(10);
    expect(out[0]).toEqual(pts[0]);
    expect(out[out.length - 1]).toEqual(pts[49]);
  });
});

describe('history', () => {
  it('undoes and redoes, and a new edit clears redo', () => {
    const v0: Item[] = [];
    const v1: Item[] = [line];
    let h = record(emptyHistory(), v0);
    const u = undo(h, v1)!;
    expect(u.items).toBe(v0);
    const r = redo(u.history, v0)!;
    expect(r.items).toBe(v1);
    h = record(u.history, v0);
    expect(h.future).toEqual([]);
    expect(undo(emptyHistory(), v0)).toBeNull();
  });
});
