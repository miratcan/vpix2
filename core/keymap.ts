// Declarative keymap dispatch by mode
import type VPixEngine from './engine';
import { MODES } from './engine';

export function dispatchKey(engine: VPixEngine, evt: { key: string; ctrlKey?: boolean }) {
  const { key, ctrlKey } = evt;
  // global
  if (ctrlKey && (key === 'z' || key === 'Z')) { engine.undo(); return 'undo'; }
  if (ctrlKey && (key === 'y' || key === 'Y')) { engine.redo(); return 'redo'; }
  if (ctrlKey && (key === '^' || key === '6')) {
    const tmp = engine.currentColorIndex;
    engine.currentColorIndex = engine.lastColorIndex;
    engine.lastColorIndex = tmp;
    (engine as any)._emit?.();
    return 'color:toggle-last';
  }
  // NORMAL: count buffer and prefixes
  if (engine.mode === MODES.NORMAL && !(engine as any)._prefix && /\d/.test(key)) {
    (engine as any).pushCountDigit(key);
    return `count:${key}`;
  }
  if (engine.mode === MODES.NORMAL && key === 'g') { (engine as any)._prefix = 'g'; return 'prefix:g'; }
  if (engine.mode === MODES.NORMAL && key === 'r') { (engine as any)._prefix = 'r'; return 'prefix:r'; }

  const count = (engine as any).countValue();
  (engine as any).clearCount();

  // Prefix continuations (NORMAL)
  if (engine.mode === MODES.NORMAL) {
    if ((engine as any)._prefix === 'r') {
      if (/^[1-9]$/.test(key)) {
        const idx = parseInt(key, 10) - 1;
        const color = engine.palette[idx];
        if (color) engine.paint(color);
        (engine as any)._prefix = null;
        return `paint:color#${idx+1}`;
      }
      if (key === 'Escape') { (engine as any)._prefix = null; return 'prefix:cancel'; }
    }
    if ((engine as any)._prefix === 'g') {
      if (key === 't') { const next = (engine.currentColorIndex + 1) % engine.palette.length; engine.setColorIndex(next); (engine as any)._prefix = null; return; }
      if (key === 'T') { const prev = (engine.currentColorIndex - 1 + engine.palette.length) % engine.palette.length; engine.setColorIndex(prev); (engine as any)._prefix = null; return; }
      if (key === 'Escape') { (engine as any)._prefix = null; return 'prefix:cancel'; }
    }
  }

  // Palette 1..9 unless prefix pending
  if (!(engine as any)._prefix && /^[1-9]$/.test(key)) { const idx = parseInt(key, 10) - 1; engine.setColorIndex(idx); return `color:set#${idx+1}`; }

  // Mode-local maps
  if (engine.mode === MODES.NORMAL) return normalMap(engine, key, count);
  if (engine.mode === MODES.INSERT) return insertMap(engine, key, count);
  if (engine.mode === MODES.VISUAL) return visualMap(engine, key, count);
}

function normalMap(e: VPixEngine, key: string, n: number) {
  if (key === 'h') { e.move(-1, 0, n); return `move:left x${n}`; }
  else if (key === 'j') { e.move(0, 1, n); return `move:down x${n}`; }
  else if (key === 'k') { e.move(0, -1, n); return `move:up x${n}`; }
  else if (key === 'l') { e.move(1, 0, n); return `move:right x${n}`; }
  else if (key === 'i') { e.setMode(MODES.INSERT); return 'mode:insert'; }
  else if (key === 'x') { for (let i = 0; i < n; i++) e.erase(); return `erase x${n}`; }
  else if (key === ' ') { for (let i = 0; i < n; i++) e.toggle(); return `toggle x${n}`; }
  else if (key === 'c') { const idx = Math.min(e.palette.length - 1, Math.max(0, n - 1)); e.setColorIndex(idx); return `color:set#${idx+1}`; }
  else if (key === 'v') { (e as any).enterVisual(); return 'mode:visual'; }
}

function insertMap(e: VPixEngine, key: string, n: number) {
  if (key === 'Escape') { e.setMode(MODES.NORMAL); return 'mode:normal'; }
  if (key === 'h') { e.move(-1, 0, n); return `move:left x${n} (ins)`; }
  else if (key === 'j') { e.move(0, 1, n); return `move:down x${n} (ins)`; }
  else if (key === 'k') { e.move(0, -1, n); return `move:up x${n} (ins)`; }
  else if (key === 'l') { e.move(1, 0, n); return `move:right x${n} (ins)`; }
  else if (key === ' ') { e.paint(); return 'paint'; }
  else if (key === 'Backspace') { e.erase(); return 'erase'; }
}

function visualMap(e: VPixEngine, key: string, n: number) {
  if (key === 'Escape') { (e as any).exitVisual(); return 'mode:normal'; }
  if (key === 'h') { e.move(-1, 0, n); (e as any)._updateSelectionRect(); return `sel-move:left x${n}`; }
  else if (key === 'j') { e.move(0, 1, n); (e as any)._updateSelectionRect(); return `sel-move:down x${n}`; }
  else if (key === 'k') { e.move(0, -1, n); (e as any)._updateSelectionRect(); return `sel-move:up x${n}`; }
  else if (key === 'l') { e.move(1, 0, n); (e as any)._updateSelectionRect(); return `sel-move:right x${n}`; }
  else if (key === 'y') { (e as any).yankSelection(); (e as any).exitVisual(); return 'yank'; }
  else if (key === 'd') { (e as any).deleteSelection(); (e as any).exitVisual(); return 'delete'; }
  else if (key === 'p') { (e as any).pasteAtCursor(); (e as any).exitVisual(); return 'paste'; }
  else if (key === 'P') { (e as any).pasteAtCursorTransparent(); (e as any).exitVisual(); return 'paste:transparent'; }
  else if (key === ']') { (e as any).rotateClipboardCW(); (e as any)._emit?.(); return 'clipboard:rotate-cw'; }
  else if (key === '[') { (e as any).rotateClipboardCCW(); (e as any)._emit?.(); return 'clipboard:rotate-ccw'; }
  else if (key === 'M') { (e as any).moveSelectionToCursor(); (e as any).exitVisual(); return 'move-selection'; }
  else if (key === 'F') { (e as any).fillSelection((e as any).color); (e as any).exitVisual(); return 'fill'; }
  else if (key === 'R') { (e as any).strokeRectSelection((e as any).color); (e as any).exitVisual(); return 'rect'; }
  else if (key === 'L') { (e as any).drawLine((e as any).selection.anchor, (e as any).cursor, (e as any).color); (e as any).exitVisual(); return 'line'; }
  else if (key === 'f') { (e as any).floodFill((e as any).cursor.x, (e as any).cursor.y, (e as any).color); (e as any).exitVisual(); return 'flood'; }
}
