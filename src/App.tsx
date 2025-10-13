import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import VPixEngine, { MODES } from '../core/engine';
import { DocumentRepository } from '../core/services/document-repository';
import { PaletteService } from '../core/services/palette-service';
import { ShareLinkService } from '../core/services/share-link-service';
import CanvasGrid from './components/CanvasGrid/CanvasGrid';
import MiniMap from './components/MiniMap/MiniMap';
import Palette from './components/Palette/Palette';
import StatusBar from './components/StatusBar/StatusBar';
import CommandFeed from './components/CommandFeed/CommandFeed';
import HelpModal from './components/HelpModal/HelpModal';
import KeyHint from './components/KeyHint/KeyHint';
import { useCommandConsole } from './hooks/useCommandConsole';
import { useEngine } from './hooks/useEngine';
import { FALLBACK_PALETTE } from './theme/colors';
import './App.css';

const STORAGE_KEY = 'vpix.document.v1';
const HELP_SHOWN_KEY = 'vpix.help.shown';
const IS_TEST_ENV = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
const DEFAULT_VIEW_WIDTH = 800;
const DEFAULT_VIEW_HEIGHT = 480;
const MIN_DYNAMIC_ZOOM = 0.01;

export default function App() {
  const paletteService = useMemo(() => new PaletteService(), []);
  const engineFactory = useCallback(() => {
    const pico = paletteService.getPaletteBySlug('pico-8');
    const colors = pico ? pico.colors : Array.from(FALLBACK_PALETTE);
    return new VPixEngine({ width: 32, height: 24, palette: colors });
  }, [paletteService]);

  // Viewport cells calculation (need to define early, but will be properly initialized later)
  const viewportCellsRef = useRef<{ width: number; height: number }>({ width: 10, height: 10 });

  const { engine, frame, feedLines, handleKeyDown: engineHandleKeyDown, currentPrefix, currentCount, keymap } = useEngine({
    factory: engineFactory,
    getViewportCells: () => viewportCellsRef.current,
  });

  const documents = useMemo(() => new DocumentRepository(STORAGE_KEY), []);
  const shareLinks = useMemo(() => new ShareLinkService(), []);
  const commandServices = useMemo(
    () => ({ documents, shareLinks, palettes: paletteService }),
    [documents, shareLinks, paletteService],
  );

  const [showHelp, setShowHelp] = useState(false);

  const {
    cmdMode,
    cmdText,
    setCmdText,
    submit,
    handleTabComplete,
    openCommand,
    closeCommand,
  } = useCommandConsole({
    engine,
    services: commandServices,
    paletteService,
    onHelp: () => setShowHelp(true),
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const focusContainer = useCallback(() => {
    if (typeof document === 'undefined') return;
    const el = containerRef.current;
    if (!el) return;
    if (document.activeElement !== el) {
      el.focus();
    }
  }, []);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [trail, setTrail] = useState<Array<{ x: number; y: number; ts: number }>>([]);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);
  const [viewSize, setViewSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : DEFAULT_VIEW_WIDTH,
    height: typeof window !== 'undefined' ? window.innerHeight : DEFAULT_VIEW_HEIGHT,
  }));

  const baseCellSize = useMemo(() => {
    const widthScale = viewSize.width / engine.width;
    const heightScale = viewSize.height / engine.height;
    const fitted = Math.min(widthScale, heightScale);
    return Math.max(1, Math.floor(fitted));
  }, [engine.height, engine.width, viewSize.height, viewSize.width]);

  const minZoom = useMemo(() => {
    const inverse = baseCellSize > 0 ? 1 / baseCellSize : 1;
    return Math.min(1, Math.max(MIN_DYNAMIC_ZOOM, inverse));
  }, [baseCellSize]);

  const cellPixelSize = useMemo(() => Math.max(1, Math.round(baseCellSize * (zoom || 1))), [baseCellSize, zoom]);

  useEffect(() => {
    setZoom((z) => (z < minZoom ? minZoom : z));
  }, [minZoom]);

  const getVisibleCellCounts = useCallback(() => {
    const cellPx = cellPixelSize;
    const visWcells = Math.max(1, Math.floor(viewSize.width / cellPx));
    const visHcells = Math.max(1, Math.floor(viewSize.height / cellPx));
    // Update ref for useEngine to access
    viewportCellsRef.current = { width: visWcells, height: visHcells };
    return { width: visWcells, height: visHcells, visWcells, visHcells };
  }, [cellPixelSize, viewSize.height, viewSize.width]);

  const scrollPanBy = useCallback(
    (dx: number, dy: number) => {
      const { visWcells, visHcells } = getVisibleCellCounts();
      setPan((prev) => {
        const maxX = Math.max(0, engine.width - visWcells);
        const maxY = Math.max(0, engine.height - visHcells);
        const nextX = Math.min(maxX, Math.max(0, prev.x + dx));
        const nextY = Math.min(maxY, Math.max(0, prev.y + dy));
        if (nextX === prev.x && nextY === prev.y) return prev;
        return { x: nextX, y: nextY };
      });
    },
    [engine, getVisibleCellCounts],
  );

  // Show help modal on first visit
  useEffect(() => {
    if (IS_TEST_ENV) return;
    const seen = localStorage.getItem(HELP_SHOWN_KEY);
    if (!seen) {
      setShowHelp(true);
      localStorage.setItem(HELP_SHOWN_KEY, 'seen');
    }
  }, []);

  // Keep cursor visible by adjusting pan to follow it.
  useEffect(() => {
    const { visWcells, visHcells } = getVisibleCellCounts();
    const margin = 2; // start scrolling a bit before the edge
    const cur = engine.cursor;

    setPan((prev) => {
      let nx = prev.x;
      let ny = prev.y;
      // horizontal
      if (cur.x < prev.x + margin) nx = Math.max(0, cur.x - margin);
      else if (cur.x >= prev.x + visWcells - margin) nx = Math.min(engine.width - visWcells, cur.x - (visWcells - 1 - margin));
      // vertical
      if (cur.y < prev.y + margin) ny = Math.max(0, cur.y - margin);
      else if (cur.y >= prev.y + visHcells - margin) ny = Math.min(engine.height - visHcells, cur.y - (visHcells - 1 - margin));
      if (nx !== prev.x || ny !== prev.y) return { x: nx, y: ny };
      return prev;
    });
  }, [engine, engine.cursor.x, engine.cursor.y, getVisibleCellCounts, zoom]);

  useEffect(() => {
    focusContainer();
  }, [focusContainer]);

  useEffect(() => {
    (async () => {
      const loadedFromLink = await shareLinks.loadFromLocation(engine);
      if (!loadedFromLink) {
        const saved = documents.load();
        if (saved) engine.loadSnapshot(saved);
      }
    })();
  }, [documents, engine, shareLinks]);

  // Cursor trail: sample intermediate cells on large jumps and timestamp them
  useEffect(() => {
    const now = performance.now ? performance.now() : Date.now();
    const cur = engine.cursor;
    const prev = lastCursorRef.current;
    lastCursorRef.current = { x: cur.x, y: cur.y };
    if (!prev) return;
    const dx = Math.abs(cur.x - prev.x);
    const dy = Math.abs(cur.y - prev.y);
    if (dx + dy <= 1) return; // only trail when skipping more than one cell
    
    const points: Array<{ x: number; y: number; ts: number }> = [];
    let x = prev.x, y = prev.y;
    const sx = cur.x > prev.x ? 1 : -1;
    const sy = cur.y > prev.y ? 1 : -1;
    let err = (dx > dy ? dx : -dy) / 2;
    const limit = 2048; // safety
    let guard = 0;
    while (true) {
      points.push({ x, y, ts: now });
      if (x === cur.x && y === cur.y) break;
      const e2 = err;
      if (e2 > -dx) { err -= dy; x += sx; }
      if (e2 < dy) { err += dx; y += sy; }
      if (++guard > limit) break;
    }
    setTrail((prevTrail) => {
      const next = prevTrail.concat(points);
      const L = 500; // ms visible window
      const cutoff = now - L;
      const pruned = next.filter((p) => p.ts >= cutoff);
      const MAX = 400;
      return pruned.length > MAX ? pruned.slice(pruned.length - MAX) : pruned;
    });
  }, [engine, engine.cursor.x, engine.cursor.y]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    // Try the new key handling system first
    if (engineHandleKeyDown(e)) {
      return;
    }

    // If not handled by the new system, continue with App.tsx specific logic
    if (showHelp) return;
    if (cmdMode && (e.target as HTMLElement).tagName === 'INPUT') return;
    if (cmdMode) { e.preventDefault(); return; }

    // Removed old Ctrl+d/u handling - now handled by useEngine keybindings
    if (e.key === '?') { setShowHelp(true); e.preventDefault(); return; }
    if (engine.mode === MODES.NORMAL && e.key === ':') { openCommand(); e.preventDefault(); return; }
    if (e.key === '+') { setZoom((z) => Math.min(8, z * 1.25)); e.preventDefault(); return; }
    if (e.key === '-') { setZoom((z) => Math.max(minZoom, z / 1.25)); e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); e.preventDefault(); return; }
    if (engine.mode === MODES.NORMAL && e.key === 'S') { documents.save(engine.toSnapshot()); e.preventDefault(); return; }
    if (engine.mode === MODES.NORMAL && e.key === 'L') {
      const data = documents.load();
      if (data) engine.loadSnapshot(data);
      e.preventDefault();
      return;
    }
    if (['h', 'j', 'k', 'l', ' ', 'Backspace', 'Tab'].includes(e.key)) e.preventDefault();
  }, [cmdMode, documents, engine, minZoom, openCommand, showHelp, getVisibleCellCounts, scrollPanBy, engineHandleKeyDown]);

  useEffect(() => {
    if (!cmdMode && !showHelp) {
      if (typeof window === 'undefined') { focusContainer(); return; }
      const handle = window.setTimeout(() => focusContainer(), 0);
      return () => window.clearTimeout(handle);
    }
    return undefined;
  }, [cmdMode, showHelp, focusContainer]);

  return (
    <div className="vpix-root">
      <div
        className="vpix-container"
        tabIndex={0}
        ref={containerRef}
        onKeyDown={handleKeyDown}
      >
        <div className="sidebar left">
          <KeyHint prefix={currentPrefix} count={currentCount} visible={true} mode={engine.mode} keymap={keymap} />
        </div>
        <div className="main-area">
          <Palette palette={engine.palette} currentIndex={engine.currentColorIndex} />
          <CanvasGrid
            engine={engine}
            zoom={zoom}
            pan={pan}
            frame={frame}
            trail={trail}
            cellSize={cellPixelSize}
            onViewSizeChange={setViewSize}
            onZoomChange={setZoom}
          />
        </div>
        <div className="sidebar right">
          <MiniMap
            engine={engine}
            pan={pan}
            zoom={zoom}
            viewW={viewSize.width}
            viewH={viewSize.height}
            frame={frame}
            cellSize={cellPixelSize}
          />
          <StatusBar engine={engine} zoom={zoom} pan={pan} />
          <CommandFeed items={feedLines} />
        </div>

        {cmdMode && (
          <div className="vpix-command-bar">
            <span className="vpix-command-prompt">:</span>
            <input
              type="text"
              value={cmdText}
              onChange={(e) => setCmdText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { submit(); e.preventDefault(); }
                else if (e.key === 'Escape') { closeCommand(); e.preventDefault(); }
                else if (e.key === 'Tab') { handleTabComplete(); e.preventDefault(); }
              }}
              autoFocus
              className="vpix-command-input"
              placeholder="help"
            />
          </div>
        )}

        {showHelp && (
          <HelpModal
            onClose={() => setShowHelp(false)}
            onDontShowAgain={() => localStorage.setItem(HELP_SHOWN_KEY, 'dont-show')}
          />
        )}
      </div>
    </div>
  );
}
