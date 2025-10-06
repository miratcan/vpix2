import type { ReadCell, Rect, ToolOperation, GridValue } from './types';

function normalizeRect(rect: Rect): Rect {
  const x1 = Math.min(rect.x1, rect.x2);
  const y1 = Math.min(rect.y1, rect.y2);
  const x2 = Math.max(rect.x1, rect.x2);
  const y2 = Math.max(rect.y1, rect.y2);
  return { x1, y1, x2, y2 };
}

export function fillRect(rect: Rect, value: GridValue, readCell: ReadCell): ToolOperation[] {
  const { x1, x2, y1, y2 } = normalizeRect(rect);
  const ops: ToolOperation[] = [];
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      if (readCell(x, y) === value) continue;
      ops.push({ x, y, value });
    }
  }
  return ops;
}
