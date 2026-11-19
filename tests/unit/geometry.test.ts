import { describe, expect, it } from 'vitest';
import {
  compactPoints,
  distanceToSegment,
  eraseAt,
  strokeHitTest,
  thinPoints,
} from '../../src/features/ink/geometry';
import type { Stroke } from '../../src/types/note';

const stroke = (id: string, points: [number, number][]): Stroke => ({
  id,
  tool: 'pen',
  color: '#000',
  width: 2,
  points: points.map(([x, y]) => [x, y, 0.5]),
});

describe('ink geometry', () => {
  it('computes distance to a segment', () => {
    expect(distanceToSegment(5, 5, 0, 0, 10, 0)).toBe(5);
    expect(distanceToSegment(-3, 4, 0, 0, 10, 0)).toBe(5);
  });

  it('hit-tests strokes including half their width', () => {
    const s = stroke('a', [
      [0, 0],
      [100, 0],
    ]);
    expect(strokeHitTest(s, 50, 5, 4)).toBe(true);
    expect(strokeHitTest(s, 50, 10, 4)).toBe(false);
  });

  it('erases only touched strokes and keeps identity when nothing changes', () => {
    const strokes = [
      stroke('a', [
        [0, 0],
        [100, 0],
      ]),
      stroke('b', [
        [0, 100],
        [100, 100],
      ]),
    ];
    expect(eraseAt(strokes, 50, 50, 5)).toBe(strokes);
    expect(eraseAt(strokes, 50, 99, 5).map((s) => s.id)).toEqual(['a']);
  });

  it('thins near-duplicate points but keeps endpoints', () => {
    const pts = thinPoints([
      [0, 0, 0.5],
      [0.1, 0, 0.5],
      [0.2, 0, 0.5],
      [5, 0, 0.5],
    ]);
    expect(pts).toEqual([
      [0, 0, 0.5],
      [5, 0, 0.5],
    ]);
  });

  it('rounds points compactly', () => {
    expect(compactPoints([[1.234, 5.678, 0.4567]])).toEqual([[1.2, 5.7, 0.46]]);
  });
});
