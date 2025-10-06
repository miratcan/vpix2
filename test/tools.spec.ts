import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import { floodFill } from '../core/tools/flood-fill';
import { fillRect } from '../core/tools/fill-rect';
import { drawLine } from '../core/tools/line';
import { strokeRect } from '../core/tools/stroke-rect';

const makeReader = (grid: Array<Array<number | null>>) => (x: number, y: number) => grid[y]?.[x] ?? null;

describe('tool algorithms', () => {
  it('fillRect returns operations only for changed cells', () => {
    const grid = [
      [0, 1, null],
      [null, 1, 1],
    ];
    const ops = fillRect({ x1: 0, y1: 0, x2: 2, y2: 1 }, 1, makeReader(grid));
    assert.equal(ops.length, 3);
    assert.deepEqual(
      ops.map((op) => [op.x, op.y, op.value]),
      [
        [0, 0, 1],
        [2, 0, 1],
        [0, 1, 1],
      ],
    );
  });

  it('strokeRect paints border without duplicates', () => {
    const grid = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    const ops = strokeRect({ x1: 0, y1: 0, x2: 2, y2: 2 }, 0, makeReader(grid));
    assert.equal(ops.length, 8);
    const uniqueKeys = new Set(ops.map((op) => `${op.x}:${op.y}`));
    assert.equal(uniqueKeys.size, ops.length);
  });

  it('drawLine generates a straight diagonal path', () => {
    const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
    const ops = drawLine({ x: 0, y: 0 }, { x: 4, y: 4 }, 3, makeReader(grid));
    assert.equal(ops.length, 5);
    for (let i = 0; i < ops.length; i += 1) {
      assert.deepEqual(ops[i], { x: i, y: i, value: 3 });
    }
  });

  it('floodFill respects bounds and target value', () => {
    const grid = [
      [0, 0, 2, 2],
      [0, 1, 2, 2],
      [0, 0, 2, 3],
    ];
    const ops = floodFill(
      { x: 0, y: 0 },
      9,
      makeReader(grid),
      { width: 4, height: 3, bounds: { x1: 0, y1: 0, x2: 1, y2: 2 } },
    );
    assert.equal(ops.length, 5);
    assert.deepEqual(
      ops
        .map((op) => [op.x, op.y])
        .sort((a, b) => (a[1] - b[1]) || (a[0] - b[0])),
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [0, 2],
        [1, 2],
      ],
    );
  });
});
