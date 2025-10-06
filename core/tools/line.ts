import type { Point, ReadCell, ToolOperation, GridValue } from './types';

export function drawLine(a: Point | null, b: Point | null, value: GridValue, readCell: ReadCell): ToolOperation[] {
  if (!a || !b) return [];
  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  const ops: ToolOperation[] = [];
  const seen = new Set<string>();
  const push = (x: number, y: number) => {
    const key = `${x}:${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (readCell(x, y) === value) return;
    ops.push({ x, y, value });
  };

  while (true) {
    push(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }

  return ops;
}
