import { useEffect, useMemo, useRef, useState } from 'react';
import VPixEngine, { MODES } from '../core/engine';
import { executeCommand, suggestCommands, helpCommands } from '../core/commands';
import { decodeFromParamV2, parseVp2Meta, encodeToParamV2R, decodeFromParamV2R } from '../core/url';
import { getPaletteByName, REGISTRY, fetchPaletteFromLospec, searchLospecPalettes } from '../core/palettes';
import CanvasGrid from './components/CanvasGrid/CanvasGrid';
import StatusBar from './components/StatusBar/StatusBar';
import Palette from './components/Palette/Palette';
import MiniMap from './components/MiniMap/MiniMap';
import Terminal from './components/Terminal/Terminal';
import './App.css';

const STORAGE_KEY = 'vpix.document.v1';

export default function App() {
  const engine = useMemo(() => {
    const pico = getPaletteByName('pico-8');
    return new VPixEngine({ width: 32, height: 24, palette: pico ? pico.colors : ['#000', '#fff'] });
  }, []);
  const [frame, setFrame] = useState(0);
  // help overlay removed — use :help
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cmdMode, setCmdMode] = useState(false);
  const [cmdText, setCmdText] = useState('');
  
  const [, setCmdHistory] = useState<string[]>([]);
  const [, setCmdHistIdx] = useState(-1); // -1 means live typing
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dirtyRects, setDirtyRects] = useState<{ x1: number; y1: number; x2: number; y2: number }[] | null>(null);
  const [termLines, setTermLines] = useState<string[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);

  useEffect(() => {
    const unsub = engine.subscribe((_, payload) => {
      if (payload && payload.changed) setDirtyRects(payload.changed);
      else setDirtyRects(null);
      setFrame((t) => t + 1);
    });
    return unsub;
  }, [engine]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.focus();
    // load from query param if present, else from hash
    (async () => {
      try {
        const url = new URL(window.location.href);
        const qp2r = url.searchParams.get('vp2r');
        const qp2 = url.searchParams.get('vp2');
        if (!qp2r && !qp2) return;
        let decoded = qp2r
          ? decodeFromParamV2R(qp2r, (opts) => new VPixEngine(opts))
          : decodeFromParamV2(qp2, (opts) => new VPixEngine(opts));
        if (!decoded) {
          const meta = parseVp2Meta(qp2r || qp2);
          if (meta && meta.slug) {
            try { await fetchPaletteFromLospec(meta.slug); } catch {}
            decoded = qp2r
              ? decodeFromParamV2R(qp2r, (opts) => new VPixEngine(opts))
              : decodeFromParamV2(qp2, (opts) => new VPixEngine(opts));
          }
        }
        if (decoded) {
          engine.width = decoded.width;
          engine.height = decoded.height;
          engine.palette = decoded.palette;
          engine.currentColorIndex = decoded.currentColorIndex;
          engine.grid = decoded.grid;
          engine._emit();
        }
      } catch {}
    })();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (cmdMode) {
      const target = e.target as HTMLElement | null;
      // allow typing in terminal input; don't block defaults
      if (target && target.closest('.term-input')) return;
      e.preventDefault();
      return;
    }
    if (e.key === '?') {
      const lines = helpCommands();
      setShowTerminal(true);
      setTermLines((ls) => [...ls, ':help', ...(lines.length ? lines : [])]);
      e.preventDefault();
      return;
    }
    if (engine.mode === MODES.NORMAL && e.key === ':') {
      setCmdMode(true); setCmdText(''); setShowTerminal(true);
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && e.key === '`') {
      setShowTerminal((v) => !v);
      e.preventDefault();
      return;
    }
    // zoom/pan
    if (e.key === '+') { setZoom((z) => Math.min(8, z * 1.25)); e.preventDefault(); return; }
    if (e.key === '-') { setZoom((z) => Math.max(0.25, z / 1.25)); e.preventDefault(); return; }
    if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); e.preventDefault(); return; }
    if (e.shiftKey && ['h','j','k','l'].includes(e.key)) {
      const step = 2;
      if (e.key === 'h') setPan((p) => ({ ...p, x: p.x - step }));
      if (e.key === 'l') setPan((p) => ({ ...p, x: p.x + step }));
      if (e.key === 'k') setPan((p) => ({ ...p, y: p.y - step }));
      if (e.key === 'j') setPan((p) => ({ ...p, y: p.y + step }));
      e.preventDefault(); return;
    }
    if (engine.mode === MODES.NORMAL && e.key === 'S') {
      localStorage.setItem(STORAGE_KEY, engine.serialize());
      e.preventDefault();
      return;
    }
    if (engine.mode === MODES.NORMAL && e.key === 'L') {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const loaded = VPixEngine.deserialize(data);
        engine.width = loaded.width;
        engine.height = loaded.height;
        engine.palette = loaded.palette;
        engine.currentColorIndex = loaded.currentColorIndex;
        engine.grid = loaded.grid;
        engine._emit();
      }
      e.preventDefault();
      return;
    }
    engine.handleKey({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey });
    if ([ 'h','j','k','l',' ','Backspace' ].includes(e.key)) e.preventDefault();
  };

  const handleCommandSubmit = async () => {
    // push to history (dedupe consecutive)
    setCmdHistory((hist) => (cmdText && hist[0] !== cmdText ? [cmdText, ...hist].slice(0, 50) : hist));
    setCmdHistIdx(-1);
    // built-in console commands first
    const t = cmdText.trim();
    if (t === 'exit') {
      setCmdMode(false);
      setShowTerminal(false);
      setCmdText('');
      return;
    }
    if (t === 'clear') {
      setTermLines([]);
      setCmdMode(false); setCmdText('');
      return;
    }
    // help is handled by command registry now
    let res = await executeCommand(engine, t as any);
    if (!res.ok && cmdText === 'link') {
      let slug: string | null = null;
      for (const name of REGISTRY.keys()) {
        const p = getPaletteByName(name);
        if (p && JSON.stringify(p.colors) === JSON.stringify(engine.palette)) { slug = p.slug; break; }
      }
      const payload = encodeToParamV2R(engine, slug || 'pico-8');
      const url = new URL(window.location.href);
      url.searchParams.set('vp2r', payload);
      history.replaceState(null, '', url.toString());
      res = { ok: true, msg: 'link updated (?vp2r=...)' };
    } else if (!res.ok && cmdText === 'copylink') {
      let slug: string | null = null;
      for (const name of REGISTRY.keys()) {
        const p = getPaletteByName(name);
        if (p && JSON.stringify(p.colors) === JSON.stringify(engine.palette)) { slug = p.slug; break; }
      }
      const payload = encodeToParamV2R(engine, slug || 'pico-8');
      const url = new URL(window.location.href);
      url.searchParams.set('vp2r', payload);
      const full = url.toString();
      if (full.length > 2000) setCmdMsg(`warning: long URL (${full.length} chars)`);
      if ((navigator as any).clipboard?.writeText) { await (navigator as any).clipboard.writeText(full).catch(() => {}); res = { ok: true, msg: 'link copied' }; }
      else { res = { ok: false, msg: full }; }
    }
    setTermLines((ls) => [...ls, `:${t}`, res.msg]);
    setCmdMsg(res.msg);
    setTimeout(() => setCmdMsg(null), 2000);
    setCmdMode(false); setCmdText('');
  };

  const handleTabComplete = () => {
    const t = cmdText;
    const sug = suggestCommands(t);
    if (sug.length > 0) {
      const base = /\s$/.test(t) ? t : t.replace(/\S+$/, '');
      setCmdText((base ? base : (t.endsWith(' ') ? t : t + ' ')) + sug[0]);
      return;
    }
    // fallback to palette autocomplete if registry had none
    const lowers = t.trimStart().toLowerCase();
    const prefixes = ['palette use ', 'palette fetch '];
    const p = prefixes.find((pfx) => lowers.startsWith(pfx));
    if (p) {
      const term = t.slice(t.toLowerCase().indexOf(p) + p.length).trim();
      const matches = Array.from(REGISTRY.keys()).filter((k) => k.startsWith(term.toLowerCase()));
      if (matches.length > 0) setCmdText(p + matches[0]);
      else searchLospecPalettes(term).then((slugs) => { if (slugs.length) setCmdText(p + slugs[0]); }).catch(() => {});
    }
  };

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
            onSubmit={handleCommandSubmit}
            onTabComplete={handleTabComplete}
          />
        )}
        
      </div>
    </div>
  );
}

// Help overlay and command/toast components removed; use :help in terminal
