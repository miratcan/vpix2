import { useEffect, useRef } from 'react';

import type VPixEngine from '../../../core/engine';
import './CanvasGrid.css';

type Rect = { x1: number; y1: number; x2: number; y2: number };
type Props = {
  engine: VPixEngine;
  zoom?: number;
  pan?: { x: number; y: number };
  frame?: number;
  dirtyRects?: Rect[] | null;
};

export default function CanvasGrid({ engine, zoom = 1, pan = { x: 0, y: 0 }, frame = 0, dirtyRects = null }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Skip drawing in jsdom test environment (no canvas impl)
    if (typeof navigator !== 'undefined' && /jsdom/i.test((navigator as any).userAgent || '')) return;
    const c = canvasRef.current;
    if (!c) return;
    let ctx = null;
    if (c && c.getContext) {
      try { ctx = c.getContext('2d', { alpha: false }); } catch { ctx = null; }
    }
    if (!ctx) return;
    const cell = Math.max(1, Math.floor(16 * zoom));
    const viewW = c.width, viewH = c.height;

    const drawCell = (x: number, y: number) => {
      const vx = (x - pan.x) * cell;
      const vy = (y - pan.y) * cell;
      if (vx + cell < 0 || vy + cell < 0 || vx >= viewW || vy >= viewH) return;
      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(Math.floor(vx), Math.floor(vy), cell, cell);
      const color = engine.grid[y][x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(vx), Math.floor(vy), cell, cell);
      }
    };

    if (dirtyRects && dirtyRects.length) {
      // redraw only dirty regions
      for (const r of dirtyRects) {
        const x1 = Math.max(0, r.x1), y1 = Math.max(0, r.y1);
        const x2 = Math.min(engine.width - 1, r.x2), y2 = Math.min(engine.height - 1, r.y2);
        for (let y = y1; y <= y2; y++) {
          for (let x = x1; x <= x2; x++) drawCell(x, y);
        }
      }
    } else {
      // full redraw
      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(0, 0, viewW, viewH);
      for (let y = 0; y < engine.height; y++) {
        for (let x = 0; x < engine.width; x++) drawCell(x, y);
      }
      // grid lines (only on full redraw)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= engine.width; x++) {
        const vx = Math.floor((x - pan.x) * cell) + 0.5;
        if (vx >= 0 && vx <= viewW) { ctx.beginPath(); ctx.moveTo(vx, 0); ctx.lineTo(vx, viewH); ctx.stroke(); }
      }
      for (let y = 0; y <= engine.height; y++) {
        const vy = Math.floor((y - pan.y) * cell) + 0.5;
        if (vy >= 0 && vy <= viewH) { ctx.beginPath(); ctx.moveTo(0, vy); ctx.lineTo(viewW, vy); ctx.stroke(); }
      }
    }
    // selection outline
    const sel = engine.selection;
    if (sel && sel.active && sel.rect) {
      const { x1, y1, x2, y2 } = sel.rect;
      ctx.strokeStyle = '#00e1ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.floor((x1 - pan.x) * cell) + 0.5,
        Math.floor((y1 - pan.y) * cell) + 0.5,
        Math.floor((x2 - x1 + 1) * cell),
        Math.floor((y2 - y1 + 1) * cell)
      );
    }
    // cursor
    const cx = Math.floor((engine.cursor.x - pan.x) * cell);
    const cy = Math.floor((engine.cursor.y - pan.y) * cell);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + 0.5, cy + 0.5, cell - 1, cell - 1);
  }, [engine, zoom, pan, frame, dirtyRects]);

  return (
    <div className="canvas-grid">
      <canvas ref={canvasRef} width={800} height={480} />
    </div>
  );
}
