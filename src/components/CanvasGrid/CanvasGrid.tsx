import { useEffect, useRef, useState } from 'react';

import type VPixEngine from '../../../core/engine';
import { GRID_THEME } from '../../theme/colors';
import './CanvasGrid.css';

type Props = {
  engine: VPixEngine;
  zoom?: number;
  pan?: { x: number; y: number };
  frame?: number;
  trail?: Array<{ x: number; y: number; ts: number }>;
  cellSize: number;
  onViewSizeChange?: (size: { width: number; height: number }) => void;
};

export default function CanvasGrid({
  engine,
  zoom = 1,
  pan = { x: 0, y: 0 },
  frame = 0,
  trail = [],
  cellSize,
  onViewSizeChange,
}: Props) {
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [viewDimensions, setViewDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const panX = pan?.x ?? 0;
  const panY = pan?.y ?? 0;
  const showGridLines = (zoom || 1) > 2;
  const axis = engine.axis;
  const axisClass = axis === 'vertical' ? 'axis-vertical' : 'axis-horizontal';
  const gridClassName = `canvas-grid ${axisClass}`;
  const { canvasBackground, gridLine, accent, cursorHighlight } = GRID_THEME;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    let lastWidth = 0;
    let lastHeight = 0;
    const applySize = (width: number, height: number) => {
      const targetWidth = Math.max(1, Math.floor(width));
      const targetHeight = Math.max(1, Math.floor(height));
      if (targetWidth === lastWidth && targetHeight === lastHeight) return;
      lastWidth = targetWidth;
      lastHeight = targetHeight;
      const baseCanvas = baseRef.current;
      const overlayCanvas = overlayRef.current;
      if (baseCanvas) {
        if (baseCanvas.width !== targetWidth) baseCanvas.width = targetWidth;
        if (baseCanvas.height !== targetHeight) baseCanvas.height = targetHeight;
      }
      if (overlayCanvas) {
        if (overlayCanvas.width !== targetWidth) overlayCanvas.width = targetWidth;
        if (overlayCanvas.height !== targetHeight) overlayCanvas.height = targetHeight;
      }
      setViewDimensions((prev) => {
        if (prev.width === targetWidth && prev.height === targetHeight) return prev;
        return { width: targetWidth, height: targetHeight };
      });
      if (onViewSizeChange) {
        onViewSizeChange({ width: targetWidth, height: targetHeight });
      }
    };

    if (typeof ResizeObserver === 'undefined') {
      applySize(wrapper.clientWidth, wrapper.clientHeight);
      return;
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        applySize(width, height);
      }
    });
    applySize(wrapper.clientWidth, wrapper.clientHeight);
    ro.observe(wrapper);
    return () => {
      ro.disconnect();
    };
  }, [onViewSizeChange]);

  const { width: viewWidth, height: viewHeight } = viewDimensions;

  useEffect(() => {
    if (typeof navigator !== 'undefined' && /jsdom/i.test((navigator as any).userAgent || '')) return;
    const canvas = baseRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    if (canvas.getContext) {
      try {
        ctx = canvas.getContext('2d', { alpha: false });
      } catch {
        ctx = null;
      }
    }
    if (!ctx) return;

    const cell = cellSize;
    const viewW = viewWidth || canvas.width;
    const viewH = viewHeight || canvas.height;
    const offsetX = -panX * cell;
    const offsetY = -panY * cell;

    const drawCell = (x: number, y: number) => {
      const vx = Math.floor(offsetX + x * cell);
      const vy = Math.floor(offsetY + y * cell);
      if (vx + cell < 0 || vy + cell < 0 || vx >= viewW || vy >= viewH) return;
      ctx.fillStyle = canvasBackground;
      ctx.fillRect(vx, vy, cell, cell);
      const colorIndex = engine.grid[y][x];
      if (colorIndex != null) {
        const color = engine.palette[colorIndex];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(vx, vy, cell, cell);
        }
      }
    };

    // Always full redraw - simpler and bug-free
    ctx.fillStyle = canvasBackground;
    ctx.fillRect(0, 0, viewW, viewH);
    for (let y = 0; y < engine.height; y++) {
      for (let x = 0; x < engine.width; x++) drawCell(x, y);
    }
  }, [cellSize, engine, panX, panY, frame, viewHeight, viewWidth]);

  // Single rAF loop to redraw overlay each frame (selection, trail, cursor)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && /jsdom/i.test((navigator as any).userAgent || '')) return;
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const draw = () => {
      const cell = cellSize;
      const viewW = canvas.width;
      const viewH = canvas.height;
      const offsetX = -panX * cell;
      const offsetY = -panY * cell;
      const gridLeft = offsetX;
      const gridTop = offsetY;
      const gridRight = offsetX + engine.width * cell;
      const gridBottom = offsetY + engine.height * cell;

      ctx.clearRect(0, 0, viewW, viewH);

      const clipLeft = Math.max(0, Math.floor(gridLeft));
      const clipRight = Math.min(viewW, Math.ceil(gridRight));
      const clipTop = Math.max(0, Math.floor(gridTop));
      const clipBottom = Math.min(viewH, Math.ceil(gridBottom));

      if (showGridLines && clipRight > clipLeft && clipBottom > clipTop) {
        ctx.strokeStyle = gridLine;
        ctx.lineWidth = 1;
        for (let x = 0; x <= engine.width; x++) {
          const vx = Math.floor(offsetX + x * cell) + 0.5;
          if (vx < 0 || vx > viewW) continue;
          const startY = Math.max(0, clipTop) + 0.5;
          const endY = Math.min(viewH, clipBottom) - 0.5;
          if (startY > endY) continue;
          ctx.beginPath();
          ctx.moveTo(vx, startY);
          ctx.lineTo(vx, endY);
          ctx.stroke();
        }
        for (let y = 0; y <= engine.height; y++) {
          const vy = Math.floor(offsetY + y * cell) + 0.5;
          if (vy < 0 || vy > viewH) continue;
          const startX = Math.max(0, clipLeft) + 0.5;
          const endX = Math.min(viewW, clipRight) - 0.5;
          if (startX > endX) continue;
          ctx.beginPath();
          ctx.moveTo(startX, vy);
          ctx.lineTo(endX, vy);
          ctx.stroke();
        }
      }

      // Selection
      const sel = engine.selection;
      if (sel && sel.active && sel.rect) {
        const { x1, y1, x2, y2 } = sel.rect;
        const sx = offsetX + x1 * cell;
        const sy = offsetY + y1 * cell;
        const sw = (x2 - x1 + 1) * cell;
        const sh = (y2 - y1 + 1) * cell;
        if (sx + sw >= 0 && sy + sh >= 0 && sx <= viewW && sy <= viewH) {
          ctx.strokeStyle = accent;
          ctx.lineWidth = 2;
          ctx.strokeRect(Math.floor(sx) + 0.5, Math.floor(sy) + 0.5, Math.floor(sw), Math.floor(sh));
        }
      }

      // Trail (filled cells) — fade from start to end
      const now = performance.now ? performance.now() : Date.now();
      const L = 500;
      const N = trail?.length || 0;
      for (let i = 0; i < N; i++) {
        const p = trail![i];
        if (p.ts < (now - L)) continue;
        const age = now - p.ts;
        const baseAlpha = Math.max(0, 1 - age / L);
        const px = offsetX + p.x * cell;
        const py = offsetY + p.y * cell;
        if (px + cell < 0 || py + cell < 0 || px > viewW || py > viewH) continue;
        ctx.save();
        // Fade from start (i=0, old/faint) to end (i=N-1, new/bright near cursor)
        const positionFactor = i / Math.max(1, N - 1);
        ctx.globalAlpha = 0.5 * baseAlpha * positionFactor;
        ctx.fillStyle = cursorHighlight;
        ctx.fillRect(Math.floor(px), Math.floor(py), Math.max(1, cell), Math.max(1, cell));
        ctx.restore();
      }

      // Cursor (topmost)
      const cx = offsetX + engine.cursor.x * cell;
      const cy = offsetY + engine.cursor.y * cell;
      if (cx + cell >= 0 && cy + cell >= 0 && cx <= viewW && cy <= viewH) {
        ctx.strokeStyle = cursorHighlight;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.floor(cx) + 0.5, Math.floor(cy) + 0.5, Math.max(1, cell - 1), Math.max(1, cell - 1));
      }

      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [cellSize, engine, panX, panY, showGridLines, trail]);

  return (
    <div className={gridClassName} ref={wrapperRef}>
      <div className="canvas-layer-stack">
        <canvas ref={baseRef} className="canvas-base" width={800} height={480} />
        <canvas ref={overlayRef} className="canvas-overlay" width={800} height={480} />
      </div>
    </div>
  );
}
