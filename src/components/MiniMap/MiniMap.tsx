import { useEffect, useRef } from 'react';
import type VPixEngine from '../../../core/engine';
import './MiniMap.css';

type Rect = { x1: number; y1: number; x2: number; y2: number };
type Props = {
  engine: VPixEngine;
  pan: { x: number; y: number };
  zoom: number;
  viewW?: number;
  viewH?: number;
  frame?: number;
  dirtyRects?: Rect[] | null;
};

export default function MiniMap({ engine, pan, zoom, viewW = 800, viewH = 480, frame = 0, dirtyRects = null }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    // Skip drawing in jsdom test environment (no canvas impl)
    if (typeof navigator !== 'undefined' && /jsdom/i.test((navigator as any).userAgent || '')) return;
    const c = ref.current;
    let ctx = null;
    if (c && c.getContext) {
      try { ctx = c.getContext('2d', { alpha: false }); } catch { ctx = null; }
    }
    if (!ctx) return;
    // Fit entire grid within canvas size
    const maxSize = 200;
    const cell = Math.max(1, Math.floor(Math.min(maxSize / engine.width, maxSize / engine.height)));
    const w = engine.width * cell;
    const h = engine.height * cell;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }

    const drawCell = (x, y) => {
      const px = x * cell, py = y * cell;
      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(px, py, cell, cell);
      const color = engine.grid[y][x];
      if (color) { ctx.fillStyle = color; ctx.fillRect(px, py, cell, cell); }
    };

    // Always full redraw (minimap small, favors correctness over micro-optim)
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < engine.height; y++) {
      for (let x = 0; x < engine.width; x++) drawCell(x, y);
    }
    // viewport rectangle
    const cellPx = 16 * (zoom || 1);
    const visWcells = Math.max(1, Math.floor(viewW / cellPx));
    const visHcells = Math.max(1, Math.floor(viewH / cellPx));
    const rx = Math.max(0, Math.min(engine.width, (pan?.x || 0))) * cell;
    const ry = Math.max(0, Math.min(engine.height, (pan?.y || 0))) * cell;
    const rw = Math.min(engine.width, visWcells) * cell;
    const rh = Math.min(engine.height, visHcells) * cell;
    ctx.strokeStyle = '#00e1ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw, rh);
  }, [engine, pan, zoom, viewW, viewH, frame, engine.grid, dirtyRects]);

  return (
    <div className="minimap">
      <canvas ref={ref} />
    </div>
  );
}
