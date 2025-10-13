import { useEffect, useRef, useState } from 'react';

import type VPixEngine from '../../../core/engine';
import { VIEWPORT, CANVAS, ANIMATION, THEME_COLORS } from '../../../core/constants';
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
  onZoomChange?: (zoom: number) => void;
};

const parseColor = (str: string) => {
  const rgbMatch = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(str);
  if (rgbMatch) {
    return { r: parseInt(rgbMatch[1], 10), g: parseInt(rgbMatch[2], 10), b: parseInt(rgbMatch[3], 10) };
  }
  const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(str);
  if (hexMatch) {
    return { r: parseInt(hexMatch[1], 16), g: parseInt(hexMatch[2], 16), b: parseInt(hexMatch[3], 16) };
  }
  const shortHexMatch = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(str);
  if (shortHexMatch) {
    return {
      r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
      g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
      b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16),
    };
  }
  return null;
};

export default function CanvasGrid({
  engine,
  zoom = 1,
  pan = { x: 0, y: 0 },
  frame = 0,
  trail = [],
  cellSize,
  onViewSizeChange,
  onZoomChange,
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
  const showGridLines = true;
  const axis = engine.axis;
  const axisClass = axis === 'vertical' ? 'axis-vertical' : 'axis-horizontal';
  const gridClassName = `canvas-grid ${axisClass}`;
  const { canvasBackground, gridLine, accent, cursorHighlight } = GRID_THEME;

  // Mouse click handler - move cursor to clicked position
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert viewport pixel coords to grid cell coords
    const offsetX = -panX * cellSize;
    const offsetY = -panY * cellSize;
    const gridX = Math.floor((clickX - offsetX) / cellSize);
    const gridY = Math.floor((clickY - offsetY) / cellSize);

    // Bounds check
    if (gridX < 0 || gridX >= engine.width || gridY < 0 || gridY >= engine.height) return;

    // Move cursor to clicked position (no painting)
    engine.cursor = { x: gridX, y: gridY };
  };

  // Mouse wheel handler - zoom in/out
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!onZoomChange) return;

    e.preventDefault();

    // Determine zoom direction from wheel delta
    const delta = e.deltaY;
    const zoomFactor = 1.25;
    const minZoom = VIEWPORT.MIN_ZOOM;
    const maxZoom = VIEWPORT.MAX_ZOOM;

    // Calculate new zoom level
    const currentZoom = zoom;
    let newZoom: number;

    if (delta < 0) {
      // Scroll up - zoom in
      newZoom = Math.min(maxZoom, currentZoom * zoomFactor);
    } else {
      // Scroll down - zoom out
      newZoom = Math.max(minZoom, currentZoom / zoomFactor);
    }

    onZoomChange(newZoom);
  };

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

    const cursorX = engine.cursor.x;
    const cursorY = engine.cursor.y;
    const showCrosshair = engine.showCrosshair;

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

      // Crosshair is now rendered in overlay canvas for full viewport coverage
    };

    // Clear viewport
    ctx.fillStyle = canvasBackground;
    ctx.fillRect(0, 0, viewW, viewH);

    // Calculate visible cell bounds
    const startX = Math.max(0, Math.floor(panX));
    const endX = Math.min(engine.width, Math.ceil(panX + viewW / cell));
    const startY = Math.max(0, Math.floor(panY));
    const endY = Math.min(engine.height, Math.ceil(panY + viewH / cell));

    // Only draw visible cells (viewport clipping optimization)
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) drawCell(x, y);
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
        ctx.lineWidth = CANVAS.GRID_LINE_WIDTH_DIVISOR / 4;
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
      const L = ANIMATION.TRAIL_DURATION_MS;
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
        ctx.globalAlpha = THEME_COLORS.TRAIL_OPACITY * baseAlpha * positionFactor;
        ctx.fillStyle = cursorHighlight;
        ctx.fillRect(Math.floor(px), Math.floor(py), Math.max(1, cell), Math.max(1, cell));
        ctx.restore();
      }

      // Guides
      const guides = engine.guides;
      if (guides.x.length > 0 || guides.y.length > 0) {
        ctx.strokeStyle = THEME_COLORS.GUIDE;
        ctx.lineWidth = CANVAS.CROSSHAIR_LINE_WIDTH;

        // Vertical guides
        for (const gx of guides.x) {
          const vx = Math.floor(offsetX + gx * cell) + 0.5;
          if (vx >= 0 && vx <= viewW) {
            ctx.beginPath();
            ctx.moveTo(vx, 0);
            ctx.lineTo(vx, viewH);
            ctx.stroke();
          }
        }

        // Horizontal guides
        for (const gy of guides.y) {
          const vy = Math.floor(offsetY + gy * cell) + 0.5;
          if (vy >= 0 && vy <= viewH) {
            ctx.beginPath();
            ctx.moveTo(0, vy);
            ctx.lineTo(viewW, vy);
            ctx.stroke();
          }
        }
      }

      // Cursor (topmost)
      const cursorX = engine.cursor.x;
      const cursorY = engine.cursor.y;
      const cx = offsetX + cursorX * cell;
      const cy = offsetY + cursorY * cell;
      const shouldDrawCursor = (now % (ANIMATION.CURSOR_BLINK_MS * 2)) < ANIMATION.CURSOR_BLINK_MS;

      // Crosshair - full viewport lines with subtle overlay
      if (engine.showCrosshair && shouldDrawCursor) {
        const crosshairY = Math.floor(cy + cell / 2) + 0.5;
        const crosshairX = Math.floor(cx + cell / 2) + 0.5;

        ctx.strokeStyle = THEME_COLORS.CROSSHAIR_PRIMARY;
        ctx.lineWidth = CANVAS.CROSSHAIR_LINE_WIDTH;

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(0, crosshairY);
        ctx.lineTo(viewW, crosshairY);
        ctx.stroke();

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(crosshairX, 0);
        ctx.lineTo(crosshairX, viewH);
        ctx.stroke();

        // Add contrasting shadow line
        ctx.strokeStyle = THEME_COLORS.CROSSHAIR_SHADOW;
        ctx.lineWidth = CANVAS.CROSSHAIR_LINE_WIDTH;

        // Horizontal shadow
        ctx.beginPath();
        ctx.moveTo(0, crosshairY + 1);
        ctx.lineTo(viewW, crosshairY + 1);
        ctx.stroke();

        // Vertical shadow
        ctx.beginPath();
        ctx.moveTo(crosshairX + 1, 0);
        ctx.lineTo(crosshairX + 1, viewH);
        ctx.stroke();
      }

      if (shouldDrawCursor && cx + cell >= 0 && cy + cell >= 0 && cx <= viewW && cy <= viewH) {
        const colorIndex = engine.grid[cursorY]?.[cursorX];
        let baseColorStr = canvasBackground;
        if (colorIndex != null) {
          const color = engine.palette[colorIndex];
          if (color) {
            baseColorStr = color;
          }
        }

        let invertedColor = cursorHighlight;
        const baseColor = parseColor(baseColorStr);

        if (baseColor) {
          const r = 255 - baseColor.r;
          const g = 255 - baseColor.g;
          const b = 255 - baseColor.b;
          invertedColor = `rgb(${r},${g},${b})`;
        }

        ctx.strokeStyle = invertedColor;
        ctx.lineWidth = CANVAS.CURSOR_STROKE_WIDTH;
        ctx.strokeRect(Math.floor(cx) + 0.5, Math.floor(cy) + 0.5, Math.max(1, cell - 1), Math.max(1, cell - 1));
      }

      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [cellSize, engine, panX, panY, showGridLines, trail]);

  return (
    <div className={gridClassName} ref={wrapperRef} onClick={handleCanvasClick} onWheel={handleWheel}>
      <div className="canvas-layer-stack">
        <canvas ref={baseRef} className="canvas-base" width={800} height={480} />
        <canvas ref={overlayRef} className="canvas-overlay" width={800} height={480} />
      </div>
    </div>
  );
}
