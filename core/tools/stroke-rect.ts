import type { ReadCell, Rect, ToolOperation, GridValue } from './types';

function normalizeRect(rect: Rect): Rect {
  const x1 = Math.min(rect.x1, rect.x2);
  const y1 = Math.min(rect.y1, rect.y2);
  const x2 = Math.max(rect.x1, rect.x2);
  const y2 = Math.max(rect.y1, rect.y2);
  return { x1, y1, x2, y2 };
}

export function strokeRect(rect: Rect, value: GridValue, readCell: ReadCell): ToolOperation[] {
  const { x1, y1, x2, y2 } = normalizeRect(rect);
  const ops: ToolOperation[] = [];
  const seen = new Set<string>();
  const push = (x: number, y: number) => {
    const key = `${x}:${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (readCell(x, y) === value) return;
    ops.push({ x, y, value });
  };

  for (let x = x1; x <= x2; x += 1) {
    push(x, y1);
    push(x, y2);
  }
  for (let y = y1; y <= y2; y += 1) {
    push(x1, y);
    push(x2, y);
  }

  return ops;
}
