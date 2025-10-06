import type { Bounds, Point, ReadCell, ToolOperation, GridValue } from './types';

export type FloodFillOptions = {
  width: number;
  height: number;
  bounds?: Bounds | null;
};

export function floodFill(
  start: Point,
  value: GridValue,
  readCell: ReadCell,
  options: FloodFillOptions,
): ToolOperation[] {
  const { width, height, bounds } = options;
  if (width <= 0 || height <= 0) return [];
  const minX = bounds ? Math.max(0, Math.min(bounds.x1, bounds.x2)) : 0;
  const maxX = bounds ? Math.min(width - 1, Math.max(bounds.x1, bounds.x2)) : width - 1;
  const minY = bounds ? Math.max(0, Math.min(bounds.y1, bounds.y2)) : 0;
  const maxY = bounds ? Math.min(height - 1, Math.max(bounds.y1, bounds.y2)) : height - 1;
  if (start.x < minX || start.x > maxX || start.y < minY || start.y > maxY) return [];
  const target = readCell(start.x, start.y);
  if (target === value) return [];
  const ops: ToolOperation[] = [];
  const stack: Point[] = [start];
  const seen = new Set<string>();
  const keyOf = (x: number, y: number) => `${x}:${y}`;

  while (stack.length) {
    const { x, y } = stack.pop()!;
    if (x < minX || x > maxX || y < minY || y > maxY) continue;
    const key = keyOf(x, y);
    if (seen.has(key)) continue;
    seen.add(key);
    if (readCell(x, y) !== target) continue;
    ops.push({ x, y, value });
    if (x + 1 < width) stack.push({ x: x + 1, y });
    if (x - 1 >= 0) stack.push({ x: x - 1, y });
    if (y + 1 < height) stack.push({ x, y: y + 1 });
    if (y - 1 >= 0) stack.push({ x, y: y - 1 });
  }

  return ops;
}
