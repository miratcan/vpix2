/* eslint-disable @typescript-eslint/member-ordering */
import { dispatchKey } from '../keymap';
import { clamp } from '../util';
import { ClipboardBuffer } from './clipboard';
import { EngineEvents } from './events';
import { GridState } from './grid-state';
import { HistoryManager, type HistoryCell, type HistoryGroup } from './history';
import { SelectionManager } from './selection';
import { MODES } from './types';

import type { EngineChangePayload, EngineSnapshot, Mode, Point } from './types';

export { MODES } from './types';
export type { Mode, Rect, EngineSnapshot } from './types';

export default class VPixEngine {
  private readonly events = new EngineEvents<VPixEngine>();
  private revision = 0;
  private gridState: GridState;
  private history: HistoryManager;
  private readonly clipboard = new ClipboardBuffer();
  private readonly selectionManager = new SelectionManager();

  private _palette: string[];
  private _currentColorIndex = 2;
  private _mode: Mode = MODES.NORMAL;
  private _countBuffer = '';
  private _prefix: 'g' | 'r' | null = null;

  cursor: Point = { x: 0, y: 0 };
  lastColorIndex = 0;

  constructor({ width = 32, height = 32, palette }: { width?: number; height?: number; palette: string[] }) {
    if (!palette || !Array.isArray(palette) || palette.length === 0) {
      throw new Error('palette is required (DI)');
    }
    this.gridState = new GridState(width, height);
    this.history = new HistoryManager();
    this._palette = palette.slice();
  }

  subscribe(fn: (engine: VPixEngine, payload?: EngineChangePayload) => void) {
    return this.events.subscribe(fn);
  }

  private emit(payload?: EngineChangePayload) {
    this.revision += 1;
    const nextPayload: EngineChangePayload = { ...(payload ?? {}), revision: this.revision };
    this.events.emit(this, nextPayload);
  }

  get width() {
    return this.gridState.width;
  }

  get height() {
    return this.gridState.height;
  }

  get palette() {
    return this._palette;
  }

  get grid() {
    return this.gridState.cells;
  }

  get mode() {
    return this._mode;
  }

  get selection() {
    return this.selectionManager.snapshot;
  }

  get prefix() {
    return this._prefix;
  }

  setPrefix(prefix: 'g' | 'r' | null) {
    this._prefix = prefix;
  }

  clearPrefix() {
    this._prefix = null;
  }

  get color() {
    return this._palette[this._currentColorIndex] ?? '#000000';
  }

  get currentColorIndex() {
    return this._currentColorIndex;
  }

  set currentColorIndex(idx: number) {
    this.setColorIndex(idx);
  }

  countValue() {
    const n = parseInt(this._countBuffer || '1', 10);
    return Number.isNaN(n) ? 1 : clamp(n, 1, 9999);
  }

  clearCount() {
    this._countBuffer = '';
  }

  pushCountDigit(d: string) {
    if (!/\d/.test(d)) return;
    if (this._countBuffer === '' && d === '0') return;
    this._countBuffer += d;
    this.emit();
  }

  setColorIndex(idx: number) {
    if (idx < 0 || idx >= this._palette.length) return;
    this.lastColorIndex = this._currentColorIndex;
    this._currentColorIndex = idx;
    this.emit();
  }

  swapToLastColor() {
    const tmp = this._currentColorIndex;
    this._currentColorIndex = this.lastColorIndex;
    this.lastColorIndex = tmp;
    this.emit();
  }

  setMode(mode: Mode) {
    if (mode !== MODES.NORMAL && mode !== MODES.INSERT && mode !== MODES.VISUAL) return;
    this._mode = mode;
    this.emit();
  }

  setPalette(colors: string[]) {
    if (!colors || colors.length === 0) return;
    this._palette = colors.slice();
    const lastIdx = this._palette.length - 1;
    this._currentColorIndex = clamp(this._currentColorIndex, 0, lastIdx);
    this.lastColorIndex = clamp(this.lastColorIndex, 0, lastIdx);
    this.emit();
  }

  setSize(width: number, height: number) {
    const changed = this.gridState.resize(width, height);
    if (!changed) return;
    this.cursor.x = Math.min(this.cursor.x, this.width - 1);
    this.cursor.y = Math.min(this.cursor.y, this.height - 1);
    this.emit();
  }

  setWidth(width: number) {
    this.setSize(width, this.height);
  }

  setHeight(height: number) {
    this.setSize(this.width, height);
  }

  move(dx: number, dy: number, count = 1) {
    const steps = Math.max(1, count);
    const prev = { x: this.cursor.x, y: this.cursor.y };
    let moved = false;
    for (let i = 0; i < steps; i++) {
      const nx = clamp(this.cursor.x + dx, 0, this.width - 1);
      const ny = clamp(this.cursor.y + dy, 0, this.height - 1);
      if (nx === this.cursor.x && ny === this.cursor.y) continue;
      this.cursor.x = nx;
      this.cursor.y = ny;
      moved = true;
      if (this._mode === MODES.INSERT) this.paint();
    }
    if (moved) {
      const curr = { x: this.cursor.x, y: this.cursor.y };
      this.emit({
        changed: [
          { x1: prev.x, y1: prev.y, x2: prev.x, y2: prev.y },
          { x1: curr.x, y1: curr.y, x2: curr.x, y2: curr.y },
        ],
      });
    }
  }

  paint(color: string = this.color) {
    const { x, y } = this.cursor;
    const prev = this.gridState.getCell(x, y);
    if (prev === color) return;
    this.recordCell({ type: 'cell', x, y, prev, next: color });
    this.gridState.writeCell(x, y, color);
    this.emit({ changed: [{ x1: x, y1: y, x2: x, y2: y }] });
  }

  erase() {
    const { x, y } = this.cursor;
    const prev = this.gridState.getCell(x, y);
    if (prev == null) return;
    this.recordCell({ type: 'cell', x, y, prev, next: null });
    this.gridState.writeCell(x, y, null);
    this.emit({ changed: [{ x1: x, y1: y, x2: x, y2: y }] });
  }

  toggle() {
    const { x, y } = this.cursor;
    const curr = this.gridState.getCell(x, y);
    if (curr == null) this.paint();
    else this.erase();
  }

  beginGroup(label = '') {
    this.history.beginGroup(label);
  }

  endGroup() {
    const grp = this.history.endGroup();
    if (!grp) return;
    if (grp.bounds) this.emit({ changed: [grp.bounds] });
    else this.emit();
  }

  undo() {
    const entry = this.history.undo();
    if (!entry) return;
    if (entry.type === 'cell') {
      this.gridState.writeCell(entry.x, entry.y, entry.prev ?? null);
      this.emit({ changed: [{ x1: entry.x, y1: entry.y, x2: entry.x, y2: entry.y }] });
      return;
    }
    this.applyGroup(entry, 'prev');
  }

  redo() {
    const entry = this.history.redoEntry();
    if (!entry) return;
    if (entry.type === 'cell') {
      this.gridState.writeCell(entry.x, entry.y, entry.next ?? null);
      this.emit({ changed: [{ x1: entry.x, y1: entry.y, x2: entry.x, y2: entry.y }] });
      return;
    }
    this.applyGroup(entry, 'next');
  }

  serialize() {
    return JSON.stringify(this.toSnapshot());
  }

  toSnapshot(): EngineSnapshot {
    return {
      width: this.width,
      height: this.height,
      palette: this._palette.slice(),
      currentColorIndex: this._currentColorIndex,
      grid: this.gridState.cloneGrid(),
    };
  }

  loadSnapshot(snapshot: EngineSnapshot) {
    this._palette = snapshot.palette.slice();
    this._currentColorIndex = clamp(snapshot.currentColorIndex ?? 0, 0, Math.max(0, this._palette.length - 1));
    this.lastColorIndex = clamp(this.lastColorIndex, 0, Math.max(0, this._palette.length - 1));
    this.gridState.load(snapshot);
    this.cursor.x = Math.min(this.cursor.x, this.width - 1);
    this.cursor.y = Math.min(this.cursor.y, this.height - 1);
    this.history = new HistoryManager();
    this.clipboard.clear();
    this.selectionManager.exit();
    this.emit();
  }

  static deserialize(json: string | EngineSnapshot) {
    const data = typeof json === 'string' ? (JSON.parse(json) as EngineSnapshot) : json;
    const eng = new VPixEngine({ width: data.width, height: data.height, palette: data.palette });
    eng.loadSnapshot(data);
    return eng;
  }

  handleKey(evt: { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) {
    return dispatchKey(this, evt as any);
  }

  enterVisual() {
    const rect = this.selectionManager.enter({ x: this.cursor.x, y: this.cursor.y });
    this.setMode(MODES.VISUAL);
    this.emit({ changed: [rect] });
  }

  exitVisual() {
    const rect = this.selectionManager.exit();
    this.setMode(MODES.NORMAL);
    if (rect) this.emit({ changed: [rect] });
  }

  updateSelectionRect() {
    const union = this.selectionManager.update({ x: this.cursor.x, y: this.cursor.y });
    if (union) this.emit({ changed: [union] });
  }

  yankSelection() {
    const rect = this.selection.rect;
    if (!rect) return;
    const w = rect.x2 - rect.x1 + 1;
    const h = rect.y2 - rect.y1 + 1;
    const cells = Array.from({ length: h }, (_, yy) =>
      Array.from({ length: w }, (_, xx) => this.gridState.getCell(rect.x1 + xx, rect.y1 + yy))
    );
    this.clipboard.store({ w, h, cells });
  }

  deleteSelection() {
    const rect = this.selection.rect;
    if (!rect) return;
    this.beginGroup('deleteSelection');
    this.yankSelection();
    for (let y = rect.y1; y <= rect.y2; y++) {
      for (let x = rect.x1; x <= rect.x2; x++) {
        const prev = this.gridState.getCell(x, y);
        if (prev == null) continue;
        this.recordCell({ type: 'cell', x, y, prev, next: null });
        this.gridState.writeCell(x, y, null);
      }
    }
    this.endGroup();
  }

  pasteAtCursor() {
    const data = this.clipboard.snapshot;
    if (!data) return;
    this.beginGroup('paste');
    for (let yy = 0; yy < data.h; yy++) {
      for (let xx = 0; xx < data.w; xx++) {
        const x = this.cursor.x + xx;
        const y = this.cursor.y + yy;
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
        const next = data.cells[yy][xx];
        const prev = this.gridState.getCell(x, y);
        this.recordCell({ type: 'cell', x, y, prev, next });
        this.gridState.writeCell(x, y, next ?? null);
      }
    }
    this.endGroup();
  }

  pasteAtCursorTransparent() {
    const data = this.clipboard.snapshot;
    if (!data) return;
    this.beginGroup('pasteTransparent');
    for (let yy = 0; yy < data.h; yy++) {
      for (let xx = 0; xx < data.w; xx++) {
        const x = this.cursor.x + xx;
        const y = this.cursor.y + yy;
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
        const next = data.cells[yy][xx];
        if (next == null) continue;
        const prev = this.gridState.getCell(x, y);
        this.recordCell({ type: 'cell', x, y, prev, next });
        this.gridState.writeCell(x, y, next);
      }
    }
    this.endGroup();
  }

  rotateClipboardCW() {
    this.clipboard.rotateCW();
    this.emit();
  }

  rotateClipboardCCW() {
    this.clipboard.rotateCCW();
    this.emit();
  }

  moveSelectionToCursor() {
    const rect = this.selection.rect;
    if (!rect) return;
    const w = rect.x2 - rect.x1 + 1;
    const h = rect.y2 - rect.y1 + 1;
    const cells = Array.from({ length: h }, (_, yy) =>
      Array.from({ length: w }, (_, xx) => this.gridState.getCell(rect.x1 + xx, rect.y1 + yy))
    );
    this.beginGroup('moveSelection');
    for (let y = rect.y1; y <= rect.y2; y++) {
      for (let x = rect.x1; x <= rect.x2; x++) {
        this.paintAt(x, y, null);
      }
    }
    const original = this.clipboard.snapshot;
    this.clipboard.store({ w, h, cells });
    this.pasteAtCursor();
    if (original) this.clipboard.store(original);
    this.endGroup();
  }

  fillSelection(color: string) {
    const rect = this.selection.rect;
    if (!rect) return;
    this.beginGroup('fill');
    for (let y = rect.y1; y <= rect.y2; y++) {
      for (let x = rect.x1; x <= rect.x2; x++) {
        const prev = this.gridState.getCell(x, y);
        if (prev === color) continue;
        this.recordCell({ type: 'cell', x, y, prev, next: color });
        this.gridState.writeCell(x, y, color);
      }
    }
    this.endGroup();
  }

  strokeRectSelection(color: string) {
    const rect = this.selection.rect;
    if (!rect) return;
    this.beginGroup('rect');
    for (let x = rect.x1; x <= rect.x2; x++) {
      this.paintAt(x, rect.y1, color);
      this.paintAt(x, rect.y2, color);
    }
    for (let y = rect.y1; y <= rect.y2; y++) {
      this.paintAt(rect.x1, y, color);
      this.paintAt(rect.x2, y, color);
    }
    this.endGroup();
  }

  drawLine(a: Point | null, b: Point | null, color: string) {
    if (!a || !b) return;
    this.beginGroup('line');
    let x0 = a.x;
    let y0 = a.y;
    const x1 = b.x;
    const y1 = b.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      this.paintAt(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    this.endGroup();
  }

  floodFill(x: number, y: number, color: string) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const target = this.gridState.getCell(x, y);
    if (target === color) return;
    this.beginGroup('flood');
    const q: Point[] = [{ x, y }];
    const seen = new Set<string>();
    const key = (xx: number, yy: number) => `${xx},${yy}`;
    while (q.length) {
      const { x: cx, y: cy } = q.pop()!;
      if (cx < 0 || cy < 0 || cx >= this.width || cy >= this.height) continue;
      const k = key(cx, cy);
      if (seen.has(k)) continue;
      seen.add(k);
      if (this.gridState.getCell(cx, cy) !== target) continue;
      this.paintAt(cx, cy, color);
      q.push({ x: cx + 1, y: cy });
      q.push({ x: cx - 1, y: cy });
      q.push({ x: cx, y: cy + 1 });
      q.push({ x: cx, y: cy - 1 });
    }
    this.endGroup();
  }

  private paintAt(x: number, y: number, color: string | null) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const prev = this.gridState.getCell(x, y);
    if (prev === color) return;
    this.recordCell({ type: 'cell', x, y, prev, next: color });
    this.gridState.writeCell(x, y, color);
  }

  private recordCell(entry: HistoryCell) {
    this.history.record(entry);
  }

  private applyGroup(group: HistoryGroup, key: 'prev' | 'next') {
    for (let i = 0; i < group.items.length; i++) {
      const it = group.items[i];
      this.gridState.writeCell(it.x, it.y, (it as any)[key] ?? null);
    }
    if (group.bounds) this.emit({ changed: [group.bounds] });
    else this.emit();
  }
}
