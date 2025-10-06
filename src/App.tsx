import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { helpCommands } from '../core/commands';
import VPixEngine, { MODES } from '../core/engine';
import { DocumentRepository } from '../core/services/document-repository';
import { PaletteService } from '../core/services/palette-service';
import { ShareLinkService } from '../core/services/share-link-service';
import CanvasGrid from './components/CanvasGrid/CanvasGrid';
import MiniMap from './components/MiniMap/MiniMap';
import Palette from './components/Palette/Palette';
import StatusBar from './components/StatusBar/StatusBar';
import Terminal from './components/Terminal/Terminal';
import { useCommandConsole } from './hooks/useCommandConsole';
import { useEngine } from './hooks/useEngine';
import './App.css';

const STORAGE_KEY = 'vpix.document.v1';

export default function App() {
  const paletteService = useMemo(() => new PaletteService(), []);
  const engineFactory = useCallback(() => {
    const pico = paletteService.getPaletteBySlug('pico-8');
    const colors = pico ? pico.colors : ['#000', '#fff'];
    return new VPixEngine({ width: 32, height: 24, palette: colors });
  }, [paletteService]);

  const { engine, frame, dirtyRects } = useEngine({ factory: engineFactory });

  const documents = useMemo(() => new DocumentRepository(STORAGE_KEY), []);
  const shareLinks = useMemo(() => new ShareLinkService(), []);
  const commandServices = useMemo(
    () => ({ documents, shareLinks, palettes: paletteService }),
    [documents, shareLinks, paletteService],
  );

  const {
    showTerminal,
    cmdMode,
    cmdText,
    setCmdText,
    termLines,
    appendLines,
    submit,
    handleTabComplete,
    openCommand,
    toggleTerminal,
  } = useCommandConsole({ engine, services: commandServices, paletteService });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (cmdMode) {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('.term-input')) return;
      e.preventDefault();
      return;
    }
    if (e.key === '?') {
      const lines = helpCommands();
      appendLines([':help', ...(lines.length ? lines : ['no commands'])]);
      e.preventDefault();
      return;
    }
    if (engine.mode === MODES.NORMAL && e.key === ':') {
      openCommand();
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && e.key === '`') {
      toggleTerminal();
      e.preventDefault();
      return;
    }
    if (e.key === '+') { setZoom((z) => Math.min(8, z * 1.25)); e.preventDefault(); return; }
    if (e.key === '-') { setZoom((z) => Math.max(0.25, z / 1.25)); e.preventDefault(); return; }
    if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); e.preventDefault(); return; }
    if (e.shiftKey && ['h', 'j', 'k', 'l'].includes(e.key)) {
      const step = 2;
      if (e.key === 'h') setPan((p) => ({ ...p, x: p.x - step }));
      if (e.key === 'l') setPan((p) => ({ ...p, x: p.x + step }));
      if (e.key === 'k') setPan((p) => ({ ...p, y: p.y - step }));
      if (e.key === 'j') setPan((p) => ({ ...p, y: p.y + step }));
      e.preventDefault();
      return;
    }
    if (engine.mode === MODES.NORMAL && e.key === 'S') {
      const ok = documents.save(engine.toSnapshot());
      appendLines([':save', ok ? 'document saved' : 'save failed']);
      e.preventDefault();
      return;
    }
    if (engine.mode === MODES.NORMAL && e.key === 'L') {
      const data = documents.load();
      if (data) {
        engine.loadSnapshot(data);
        appendLines([':load', 'document loaded']);
      } else {
        appendLines([':load', 'no saved document']);
      }
      e.preventDefault();
      return;
    }
    engine.handleKey({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey });
    if (['h', 'j', 'k', 'l', ' ', 'Backspace'].includes(e.key)) e.preventDefault();
  }, [appendLines, cmdMode, documents, engine, openCommand, toggleTerminal]);

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
          <CanvasGrid engine={engine} zoom={zoom} pan={pan} frame={frame} dirtyRects={dirtyRects} />
        </div>
        <div className="side-panel">
          <StatusBar engine={engine} zoom={zoom} pan={pan} />
          <MiniMap engine={engine} pan={pan} zoom={zoom} viewW={800} viewH={480} frame={frame} dirtyRects={dirtyRects} />
        </div>
        {(showTerminal || cmdMode || termLines.length > 0) && (
          <Terminal
            lines={termLines}
            cmdMode={cmdMode}
            cmdText={cmdText}
            onChangeText={setCmdText}
            onSubmit={submit}
            onTabComplete={handleTabComplete}
          />
        )}
      </div>
    </div>
  );
}
