import type { GridValue, Point, ReadCell, Rect, ToolOperation } from './types';

function normalizeRect(rect: Rect): Rect {
  const x1 = Math.min(rect.x1, rect.x2);
  const y1 = Math.min(rect.y1, rect.y2);
  const x2 = Math.max(rect.x1, rect.x2);
  const y2 = Math.max(rect.y1, rect.y2);
  return { x1, y1, x2, y2 };
}

function isInsideEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  const dx = x - cx;
  const dy = y - cy;

  if (rx === 0 && ry === 0) {
    return Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5;
  }

  if (rx === 0) {
    return Math.abs(dx) <= 0.5 && Math.abs(dy) <= ry + 0.5;
  }

  if (ry === 0) {
    return Math.abs(dy) <= 0.5 && Math.abs(dx) <= rx + 0.5;
  }

  const normX = dx / rx;
  const normY = dy / ry;
  return normX * normX + normY * normY <= 1 + 1e-6;
}

function collectEllipsePoints(rect: Rect): { points: Point[]; lookup: Set<string> } {
  const { x1, y1, x2, y2 } = normalizeRect(rect);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const rx = (x2 - x1) / 2;
  const ry = (y2 - y1) / 2;

  const points: Point[] = [];
  const lookup = new Set<string>();

  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      if (!isInsideEllipse(x, y, cx, cy, rx, ry)) continue;
      const key = `${x}:${y}`;
      if (lookup.has(key)) continue;
      lookup.add(key);
      points.push({ x, y });
    }
  }

  return { points, lookup };
}

export function fillEllipse(rect: Rect, value: GridValue, readCell: ReadCell): ToolOperation[] {
  const { points } = collectEllipsePoints(rect);
  const ops: ToolOperation[] = [];

  for (const point of points) {
    if (readCell(point.x, point.y) === value) continue;
    ops.push({ x: point.x, y: point.y, value });
  }

  return ops;
}

function isInterior(point: Point, lookup: Set<string>) {
  const left = `${point.x - 1}:${point.y}`;
  const right = `${point.x + 1}:${point.y}`;
  const up = `${point.x}:${point.y - 1}`;
  const down = `${point.x}:${point.y + 1}`;
  return lookup.has(left) && lookup.has(right) && lookup.has(up) && lookup.has(down);
}

export function strokeEllipse(rect: Rect, value: GridValue, readCell: ReadCell): ToolOperation[] {
  const { points, lookup } = collectEllipsePoints(rect);
  const ops: ToolOperation[] = [];

  for (const point of points) {
    if (isInterior(point, lookup)) continue;
    if (readCell(point.x, point.y) === value) continue;
    ops.push({ x: point.x, y: point.y, value });
  }

  return ops;
}
