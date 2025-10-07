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
import { useCommandConsole } from './hooks/useCommandConsole';
import { useEngine } from './hooks/useEngine';
import { FALLBACK_PALETTE } from './theme/colors';
import './App.css';

const STORAGE_KEY = 'vpix.document.v1';
const HELP_SHOWN_KEY = 'vpix.help.shown';

export default function App() {
  const paletteService = useMemo(() => new PaletteService(), []);
  const engineFactory = useCallback(() => {
    const pico = paletteService.getPaletteBySlug('pico-8');
    const colors = pico ? pico.colors : Array.from(FALLBACK_PALETTE);
    return new VPixEngine({ width: 32, height: 24, palette: colors });
  }, [paletteService]);

  const { engine, frame } = useEngine({ factory: engineFactory });

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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [trail, setTrail] = useState<Array<{ x: number; y: number; ts: number }>>([]);
  const [cmdFeed, setCmdFeed] = useState<Array<{ id: string; display: string }>>([]);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);

  // Show help modal on first visit
  useEffect(() => {
    const seen = localStorage.getItem(HELP_SHOWN_KEY);
    if (!seen) {
      setShowHelp(true);
      localStorage.setItem(HELP_SHOWN_KEY, 'seen');
    }
  }, []);

  // Keep cursor visible by adjusting pan to follow it.
  useEffect(() => {
    // Visible cell size in pixels
    const cellPx = 16 * (zoom || 1);
    const viewW = 800;
    const viewH = 480;
    const visWcells = Math.max(1, Math.floor(viewW / cellPx));
    const visHcells = Math.max(1, Math.floor(viewH / cellPx));
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
  }, [engine, engine.cursor.x, engine.cursor.y, zoom]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    (async () => {
      const loadedFromLink = await shareLinks.loadFromLocation(engine);
      if (!loadedFromLink) {
        const saved = documents.load();
        if (saved) engine.loadSnapshot(saved);
      }
    })();
  }, [documents, engine, shareLinks]);

  // Subscribe to engine events to capture executed command labels
  useEffect(() => {
    const unsub = engine.subscribe((_, payload) => {
      const anyPayload = payload as any;
      if (anyPayload && anyPayload.cmd) {
        const { id, display } = anyPayload.cmd as { id: string; display: string };
        setCmdFeed((prev) => {
          // Create a truly unique ID for each event to ensure it's always added to the feed.
          const uniqueId = `${id}-${Date.now()}-${Math.random()}`;
          const next = [...prev, { id: uniqueId, display }];
          const MAX = 50;
          return next.length > MAX ? next.slice(next.length - MAX) : next;
        });
      }
    });
    return unsub;
  }, [engine]);

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
    // Bresenham-like sampling between prev and cur inclusive
    const points: Array<{ x: number; y: number; ts: number }> = [];
    let x = prev.x, y = prev.y;
    const sx = cur.x > prev.x ? 1 : -1;
    const sy = cur.y > prev.y ? 1 : -1;
    let err = (dx > dy ? dx : -dy) / 2;
    const limit = 2048; // safety
    let guard = 0;
    while (true) {
      // All points get the same timestamp - render code handles the fade
      points.push({ x, y, ts: now });
      if (x === cur.x && y === cur.y) break;
      const e2 = err;
      if (e2 > -dx) { err -= dy; x += sx; }
      if (e2 < dy) { err += dx; y += sy; }
      if (++guard > limit) break;
    }
    setTrail((prevTrail) => {
      const next = prevTrail.concat(points);
      // prune old points by time window and length cap
      const L = 500; // ms visible window
      const cutoff = now - L;
      const pruned = next.filter((p) => p.ts >= cutoff);
      const MAX = 400;
      return pruned.length > MAX ? pruned.slice(pruned.length - MAX) : pruned;
    });
  }, [engine, engine.cursor.x, engine.cursor.y]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // If help modal is open, ignore keys (modal handles ESC)
    if (showHelp) {
      return;
    }

    // If command mode input is focused, let it handle keys
    if (cmdMode && (e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }

    // Ignore other keys when command mode is active
    if (cmdMode) {
      e.preventDefault();
      return;
    }

    if (e.key === '?') {
      setShowHelp(true);
      e.preventDefault();
      return;
    }
    if (engine.mode === MODES.NORMAL && e.key === ':') {
      openCommand();
      e.preventDefault();
      return;
    }
    if (e.key === '+') { setZoom((z) => Math.min(8, z * 1.25)); e.preventDefault(); return; }
    if (e.key === '-') { setZoom((z) => Math.max(0.25, z / 1.25)); e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      e.preventDefault();
      return;
    }
    if (engine.mode === MODES.NORMAL && e.key === 'S') {
      documents.save(engine.toSnapshot());
      e.preventDefault();
      return;
    }
    if (engine.mode === MODES.NORMAL && e.key === 'L') {
      const data = documents.load();
      if (data) {
        engine.loadSnapshot(data);
      }
      e.preventDefault();
      return;
    }
    engine.handleKey({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey });
    if (['h', 'j', 'k', 'l', ' ', 'Backspace', 'Tab'].includes(e.key)) e.preventDefault();
  }, [cmdMode, documents, engine, openCommand, showHelp]);

  return (
    <div className="vpix-root">
      <div
        className="vpix-container"
        tabIndex={0}
        ref={containerRef}
        onKeyDown={handleKeyDown}
      >
        <div className="main-area">
          <Palette palette={engine.palette} currentIndex={engine.currentColorIndex} />
          <CanvasGrid engine={engine} zoom={zoom} pan={pan} frame={frame} trail={trail} />
        </div>
        <div className="side-panel">
          <MiniMap engine={engine} pan={pan} zoom={zoom} viewW={800} viewH={480} frame={frame} />
          <StatusBar engine={engine} zoom={zoom} pan={pan} />
          <CommandFeed items={cmdFeed} engine={engine} />
        </div>

        {cmdMode && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--color-background)',
              borderTop: '2px solid var(--color-accent)',
              padding: '0.5rem 1rem',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span style={{ color: 'var(--color-accent)', fontFamily: 'monospace', fontSize: '1rem' }}>:</span>
            <input
              type="text"
              value={cmdText}
              onChange={(e) => setCmdText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submit();
                  e.preventDefault();
                } else if (e.key === 'Escape') {
                  closeCommand();
                  e.preventDefault();
                } else if (e.key === 'Tab') {
                  handleTabComplete();
                  e.preventDefault();
                }
              }}
              autoFocus
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--color-text)',
                fontFamily: 'monospace',
                fontSize: '1rem',
              }}
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
