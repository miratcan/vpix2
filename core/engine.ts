// VPix core engine in TypeScript
import { dispatchKey } from './keymap';
import { clamp } from './util';

export const MODES = {
  NORMAL: 'normal',
  INSERT: 'insert',
  VISUAL: 'visual',
} as const;

export type Mode = typeof MODES[keyof typeof MODES];
export type Rect = { x1: number; y1: number; x2: number; y2: number };
type HistoryCell = { type: 'cell'; x: number; y: number; prev: string | null | undefined; next: string | null | undefined };
type HistoryGroup = { type: 'group'; label: string; items: HistoryCell[]; bounds: Rect | null };
type HistoryEntry = HistoryCell | HistoryGroup;

export default class VPixEngine {
  width: number;
  height: number;
  palette: string[];
  currentColorIndex = 2;
  mode: Mode = MODES.NORMAL;
  cursor = { x: 0, y: 0 };
  grid: (string | null)[][];
  private _countBuffer = '';
  private _subscribers = new Set<(eng: VPixEngine, payload?: { changed?: Rect[] }) => void>();
  private _history: HistoryEntry[] = [];
  private _redo: HistoryEntry[] = [];
  lastColorIndex = 0;
  _prefix: 'g' | 'r' | null = null;
  selection: { active: boolean; anchor: { x: number; y: number } | null; rect: Rect | null } = { active: false, anchor: null, rect: null };
  private _clipboard: { w: number; h: number; cells: (string | null)[][] } | null = null;
  private _group: { label: string; items: HistoryCell[]; bounds: Rect | null } | null = null;

  constructor({ width = 32, height = 32, palette }: { width?: number; height?: number; palette: string[] }) {
    this.width = width;
    this.height = height;
    if (!palette || !Array.isArray(palette) || palette.length === 0) {
      throw new Error('palette is required (DI)');
    }
    this.palette = palette;
    this.grid = Array.from({ length: height }, () => Array<string | null>(width).fill(null));
  }

  setSize(newWidth: number, newHeight: number) {
    const w = clamp(newWidth | 0, 1, 256);
    const h = clamp(newHeight | 0, 1, 256);
    if (w === this.width && h === this.height) return;
    const newGrid = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
    const copyH = Math.min(this.height, h);
    const copyW = Math.min(this.width, w);
    for (let y = 0; y < copyH; y++) for (let x = 0; x < copyW; x++) newGrid[y][x] = this.grid[y][x];
    this.width = w;
    this.height = h;
    this.grid = newGrid;
    this.cursor.x = Math.min(this.cursor.x, this.width - 1);
    this.cursor.y = Math.min(this.cursor.y, this.height - 1);
    this._emit();
  }
  setWidth(newWidth: number) { this.setSize(newWidth, this.height); }
  setHeight(newHeight: number) { this.setSize(this.width, newHeight); }

  subscribe(fn: (eng: VPixEngine, payload?: { changed?: Rect[] }) => void) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }
  private _emit(payload?: { changed?: Rect[] }) { this._subscribers.forEach((fn) => fn(this, payload)); }

  get color() { return this.palette[this.currentColorIndex] ?? '#000000'; }
  setColorIndex(idx: number) {
    if (idx >= 0 && idx < this.palette.length) {
      this.lastColorIndex = this.currentColorIndex;
      this.currentColorIndex = idx;
      this._emit();
    }
  }
  setMode(mode: Mode) {
    if (mode === MODES.NORMAL || mode === MODES.INSERT || mode === MODES.VISUAL) { this.mode = mode; this._emit(); }
  }

  countValue() { const n = parseInt(this._countBuffer || '1', 10); return Number.isNaN(n) ? 1 : Math.max(1, Math.min(9999, n)); }
  clearCount() { this._countBuffer = ''; }
  pushCountDigit(d: string) { if (/\d/.test(d)) { if (this._countBuffer === '' && d === '0') return; this._countBuffer += d; this._emit(); } }
  

  move(dx: number, dy: number, count = 1) {
    const steps = Math.max(1, count);
    const prevPos = { x: this.cursor.x, y: this.cursor.y };
    let moved = false;
    for (let i = 0; i < steps; i++) {
      const nx = clamp(this.cursor.x + dx, 0, this.width - 1);
      const ny = clamp(this.cursor.y + dy, 0, this.height - 1);
      if (nx !== this.cursor.x || ny !== this.cursor.y) { this.cursor.x = nx; this.cursor.y = ny; moved = true; if (this.mode === MODES.INSERT) this.paint(); }
    }
    if (moved) {
      const curr = { x: this.cursor.x, y: this.cursor.y };
      this._emit({ changed: [ { x1: prevPos.x, y1: prevPos.y, x2: prevPos.x, y2: prevPos.y }, { x1: curr.x, y1: curr.y, x2: curr.x, y2: curr.y } ]});
    }
  }

  paint(color: string = this.color) {
    const { x, y } = this.cursor;
    const prev = this.grid[y][x];
    if (prev === color) return;
    this._record({ type: 'cell', x, y, prev, next: color });
    this.grid[y][x] = color;
    this._emit({ changed: [ { x1: x, y1: y, x2: x, y2: y } ]});
  }
  erase() {
    const { x, y } = this.cursor;
    const prev = this.grid[y][x];
    if (prev == null) return;
    this._record({ type: 'cell', x, y, prev, next: null });
    this.grid[y][x] = null;
    this._emit({ changed: [ { x1: x, y1: y, x2: x, y2: y } ]});
  }
  toggle() { const { x, y } = this.cursor; if (this.grid[y][x] == null) this.paint(); else this.erase(); }

  private _record(entry: HistoryCell) {
    if (this._group) {
      this._group.items.push(entry);
      const b = this._group.bounds || { x1: entry.x, y1: entry.y, x2: entry.x, y2: entry.y };
      this._group.bounds = { x1: Math.min(b.x1, entry.x), y1: Math.min(b.y1, entry.y), x2: Math.max(b.x2, entry.x), y2: Math.max(b.y2, entry.y) };
    } else {
      this._history.push(entry);
      if (this._history.length > 1000) this._history.shift();
      this._redo = [];
    }
  }
  beginGroup(label = '') { if (this._group) return; this._group = { label, items: [], bounds: null }; }
  endGroup() {
    if (!this._group) return;
    const grp = this._group; this._group = null;
    if (grp.items.length === 0) return;
    this._history.push({ type: 'group', label: grp.label, items: grp.items, bounds: grp.bounds });
    if (this._history.length > 1000) this._history.shift();
    this._redo = [];
    if (grp.bounds) this._emit({ changed: [grp.bounds] });
  }
  undo() {
    const entry = this._history.pop(); if (!entry) return;
    if (entry.type === 'cell') {
      this.grid[entry.y][entry.x] = entry.prev ?? null; this._redo.push(entry); this._emit({ changed: [ { x1: entry.x, y1: entry.y, x2: entry.x, y2: entry.y } ]}); return;
    } else {
      for (let i = entry.items.length - 1; i >= 0; i--) { const it = entry.items[i]; this.grid[it.y][it.x] = it.prev ?? null; }
      this._redo.push(entry); const b = entry.bounds; if (b) this._emit({ changed: [ b ] }); else this._emit(); return;
    }
  }
  redo() {
    const entry = this._redo.pop(); if (!entry) return;
    if (entry.type === 'cell') {
      this.grid[entry.y][entry.x] = entry.next ?? null; this._history.push(entry); this._emit({ changed: [ { x1: entry.x, y1: entry.y, x2: entry.x, y2: entry.y } ]}); return;
    } else {
      for (let i = 0; i < entry.items.length; i++) { const it = entry.items[i]; this.grid[it.y][it.x] = it.next ?? null; }
      this._history.push(entry); const b = entry.bounds; if (b) this._emit({ changed: [ b ] }); else this._emit(); return;
    }
  }

  serialize() { return JSON.stringify({ v: 1, width: this.width, height: this.height, palette: this.palette, currentColorIndex: this.currentColorIndex, grid: this.grid }); }
  static deserialize(json: string | any) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    const eng = new VPixEngine({ width: data.width, height: data.height, palette: data.palette });
    eng.currentColorIndex = data.currentColorIndex ?? 0; eng.grid = data.grid.map((row: any[]) => row.slice()); return eng;
  }

  handleKey(evt: { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) { return dispatchKey(this, evt as any); }

  enterVisual() {
    this.selection.active = true; this.selection.anchor = { x: this.cursor.x, y: this.cursor.y };
    this.selection.rect = { x1: this.cursor.x, y1: this.cursor.y, x2: this.cursor.x, y2: this.cursor.y };
    this.setMode(MODES.VISUAL); const r = this.selection.rect!; this._emit({ changed: [ r ] });
  }
  exitVisual() { const r = this.selection.rect; this.selection.active = false; this.selection.anchor = null; this.selection.rect = null; this.setMode(MODES.NORMAL); if (r) this._emit({ changed: [ r ] }); }
  _updateSelectionRect() {
    if (!this.selection.active || !this.selection.anchor) return;
    const prev = this.selection.rect; const { anchor } = this.selection;
    const x1 = Math.min(anchor.x, this.cursor.x); const y1 = Math.min(anchor.y, this.cursor.y);
    const x2 = Math.max(anchor.x, this.cursor.x); const y2 = Math.max(anchor.y, this.cursor.y);
    this.selection.rect = { x1, y1, x2, y2 };
    const union = prev ? { x1: Math.min(prev.x1, x1), y1: Math.min(prev.y1, y1), x2: Math.max(prev.x2, x2), y2: Math.max(prev.y2, y2) } : { x1, y1, x2, y2 };
    this._emit({ changed: [ union ] });
  }
  yankSelection() {
    const r = this.selection.rect; if (!r) return; const w = r.x2 - r.x1 + 1; const h = r.y2 - r.y1 + 1;
    const cells = Array.from({ length: h }, (_, yy) => Array.from({ length: w }, (_, xx) => this.grid[r.y1 + yy][r.x1 + xx]));
    this._clipboard = { w, h, cells };
  }
  deleteSelection() {
    const r = this.selection.rect; if (!r) return; this.beginGroup('deleteSelection'); this.yankSelection();
    for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) { const prev = this.grid[y][x]; if (prev != null) { this._record({ type: 'cell', x, y, prev, next: null }); this.grid[y][x] = null; } }
    this.endGroup();
  }
  pasteAtCursor() {
    if (!this._clipboard) return; const { w, h, cells } = this._clipboard; this.beginGroup('paste');
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const x = this.cursor.x + xx, y = this.cursor.y + yy; if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue; const next = cells[yy][xx]; const prev = this.grid[y][x]; this._record({ type: 'cell', x, y, prev, next }); this.grid[y][x] = next ?? null; }
    this.endGroup();
  }
  pasteAtCursorTransparent() {
    if (!this._clipboard) return; const { w, h, cells } = this._clipboard; this.beginGroup('pasteTransparent');
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const x = this.cursor.x + xx, y = this.cursor.y + yy; if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue; const next = cells[yy][xx]; if (next == null) continue; const prev = this.grid[y][x]; this._record({ type: 'cell', x, y, prev, next }); this.grid[y][x] = next; }
    this.endGroup();
  }
  rotateClipboardCW() {
    if (!this._clipboard) return; const { w, h, cells } = this._clipboard; const out = Array.from({ length: w }, () => Array<string | null>(h).fill(null));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[x][h - 1 - y] = cells[y][x]; this._clipboard = { w: h, h: w, cells: out };
  }
  rotateClipboardCCW() {
    if (!this._clipboard) return; const { w, h, cells } = this._clipboard; const out = Array.from({ length: w }, () => Array<string | null>(h).fill(null));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[w - 1 - x][y] = cells[y][x]; this._clipboard = { w: h, h: w, cells: out };
  }
  moveSelectionToCursor() {
    const r = this.selection.rect; if (!r) return; this.beginGroup('moveSelection'); const w = r.x2 - r.x1 + 1; const h = r.y2 - r.y1 + 1; const cells = Array.from({ length: h }, (_, yy) => Array.from({ length: w }, (_, xx) => this.grid[r.y1 + yy][r.x1 + xx]));
    for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) this._paintAt(x, y, null);
    const orig = this._clipboard; this._clipboard = { w, h, cells }; this.pasteAtCursor(); this._clipboard = orig; this.endGroup();
  }
  fillSelection(color: string) {
    const r = this.selection.rect; if (!r) return; this.beginGroup('fill');
    for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) { const prev = this.grid[y][x]; if (prev !== color) { this._record({ type: 'cell', x, y, prev, next: color }); this.grid[y][x] = color; } }
    this.endGroup();
  }
  strokeRectSelection(color: string) {
    const r = this.selection.rect; if (!r) return; this.beginGroup('rect'); for (let x = r.x1; x <= r.x2; x++) { this._paintAt(x, r.y1, color); this._paintAt(x, r.y2, color); } for (let y = r.y1; y <= r.y2; y++) { this._paintAt(r.x1, y, color); this._paintAt(r.x2, y, color); } this.endGroup();
  }
  private _paintAt(x: number, y: number, color: string | null) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return; const prev = this.grid[y][x]; if (prev === color) return; this._record({ type: 'cell', x, y, prev, next: color }); this.grid[y][x] = color;
  }
  drawLine(a: { x: number; y: number } | null, b: { x: number; y: number } | null, color: string) {
    if (!a || !b) return; this.beginGroup('line'); let x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y; const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0); const sx = x0 < x1 ? 1 : -1; const sy = y0 < y1 ? 1 : -1; let err = dx - dy; while (true) { this._paintAt(x0, y0, color); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } } this.endGroup();
  }
  floodFill(x: number, y: number, color: string) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return; const target = this.grid[y][x]; if (target === color) return; this.beginGroup('flood'); const q: [number, number][] = [[x, y]]; const seen = new Set<string>(); const key = (xx: number, yy: number) => `${xx},${yy}`; while (q.length) { const [cx, cy] = q.pop()!; if (cx < 0 || cy < 0 || cx >= this.width || cy >= this.height) continue; const k = key(cx, cy); if (seen.has(k)) continue; seen.add(k); if (this.grid[cy][cx] !== target) continue; this._paintAt(cx, cy, color); q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); } this.endGroup();
  }
}
