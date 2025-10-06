/* eslint-disable @typescript-eslint/member-ordering */
import { dispatchKey } from '../keymap';
import { clamp } from '../util';
import { ClipboardBuffer } from './clipboard';
import { EngineEvents } from './events';
import { GridState } from './grid-state';
import { HistoryManager, type HistoryCell, type HistoryGroup } from './history';
import { SelectionManager } from './selection';
import { MODES } from './types';

import type { Axis, EngineChangePayload, EngineSnapshot, Mode, Point } from './types';

export type OperatorKind = 'delete' | 'yank' | 'change';
type MotionKind =
  | 'word-next'
  | 'word-prev'
  | 'word-end-next'
  | 'word-end-prev'
  | 'line-begin'
  | 'line-first-nonblank'
  | 'line-end'
  | 'canvas-begin'
  | 'canvas-end';

type AxisSegment = { axis: Axis; fixed: number; start: number; end: number };
type MotionResolution = { target: Point; axis: Axis; exclusive: boolean; moved: boolean };
type PendingOperator = { op: OperatorKind; count: number };

export { MODES } from './types';
export type { Mode, EngineSnapshot } from './types';
export type { MotionResolution };
export type { AxisSegment };
export type { MotionKind };

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
  private _axis: Axis = 'horizontal';
  private _pendingOperator: PendingOperator | null = null;
  private lastAction: (() => void) | null = null;

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

  get pendingOperator(): PendingOperator | null {
    return this._pendingOperator;
  }

  setPendingOperator(op: OperatorKind, count = 1) {
    this._pendingOperator = { op, count: Math.max(1, count | 0) };
    this.emit();
  }

  clearPendingOperator() {
    if (!this._pendingOperator) return;
    this._pendingOperator = null;
    this.emit();
  }

  recordLastAction(action: ((engine: VPixEngine) => void) | null) {
    this.lastAction = action ? () => action(this) : null;
  }

  repeatLastAction() {
    if (!this.lastAction) return;
    this.lastAction();
  }

  get axis(): Axis {
    return this._axis;
  }

  setAxis(axis: Axis) {
    if (axis !== 'horizontal' && axis !== 'vertical') return;
    if (this._axis === axis) return;
    this._axis = axis;
    this.emit();
  }

  toggleAxis() {
    this._axis = this._axis === 'horizontal' ? 'vertical' : 'horizontal';
    this.emit();
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

  hasCount() {
    return this._countBuffer.length > 0;
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
      this.emit();
    }
  }

  paint(colorIndex: number = this._currentColorIndex) {
    const { x, y } = this.cursor;
    const prev = this.gridState.getCell(x, y);
    if (prev === colorIndex) return;
    this.recordCell({ type: 'cell', x, y, prev, next: colorIndex });
    this.gridState.writeCell(x, y, colorIndex);
    this.emit();
  }

  erase() {
    const { x, y } = this.cursor;
    const prev = this.gridState.getCell(x, y);
    if (prev == null) return;
    this.recordCell({ type: 'cell', x, y, prev, next: null });
    this.gridState.writeCell(x, y, null);
    this.emit();
  }

  cut() {
    const { x, y } = this.cursor;
    const colorIndex = this.gridState.getCell(x, y);
    if (colorIndex == null) return;

    // Put single cell into clipboard
    this.clipboard.store({ w: 1, h: 1, cells: [[colorIndex]] });

    // Then erase it
    this.erase();
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
    this.emit();
  }

  undo() {
    const entry = this.history.undo();
    if (!entry) return;
    if (entry.type === 'cell') {
      this.gridState.writeCell(entry.x, entry.y, entry.prev ?? null);
      this.emit();
      return;
    }
    this.applyGroup(entry, 'prev');
  }

  redo() {
    const entry = this.history.redoEntry();
    if (!entry) return;
    if (entry.type === 'cell') {
      this.gridState.writeCell(entry.x, entry.y, entry.next ?? null);
      this.emit();
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
      axis: this._axis,
    };
  }

  loadSnapshot(snapshot: EngineSnapshot) {
    this._palette = snapshot.palette.slice();
    this._currentColorIndex = clamp(snapshot.currentColorIndex ?? 0, 0, Math.max(0, this._palette.length - 1));
    this.lastColorIndex = clamp(this.lastColorIndex, 0, Math.max(0, this._palette.length - 1));
    this.gridState.load(snapshot);
    this._axis = snapshot.axis ?? 'horizontal';
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
    this.selectionManager.enter({ x: this.cursor.x, y: this.cursor.y });
    this.setMode(MODES.VISUAL);
    this.emit();
  }

  exitVisual() {
    this.selectionManager.exit();
    this.setMode(MODES.NORMAL);
    this.emit();
  }

  updateSelectionRect() {
    this.selectionManager.update({ x: this.cursor.x, y: this.cursor.y });
    this.emit();
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

  fillSelection(colorIndex: number = this._currentColorIndex) {
    const rect = this.selection.rect;
    if (!rect) return;
    this.beginGroup('fill');
    for (let y = rect.y1; y <= rect.y2; y++) {
      for (let x = rect.x1; x <= rect.x2; x++) {
        const prev = this.gridState.getCell(x, y);
        if (prev === colorIndex) continue;
        this.recordCell({ type: 'cell', x, y, prev, next: colorIndex });
        this.gridState.writeCell(x, y, colorIndex);
      }
    }
    this.endGroup();
  }

  strokeRectSelection(colorIndex: number = this._currentColorIndex) {
    const rect = this.selection.rect;
    if (!rect) return;
    this.beginGroup('rect');
    for (let x = rect.x1; x <= rect.x2; x++) {
      this.paintAt(x, rect.y1, colorIndex);
      this.paintAt(x, rect.y2, colorIndex);
    }
    for (let y = rect.y1; y <= rect.y2; y++) {
      this.paintAt(rect.x1, y, colorIndex);
      this.paintAt(rect.x2, y, colorIndex);
    }
    this.endGroup();
  }

  drawLine(a: Point | null, b: Point | null, colorIndex: number = this._currentColorIndex) {
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
      this.paintAt(x0, y0, colorIndex);
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

  floodFill(x: number, y: number, colorIndex: number = this._currentColorIndex) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const target = this.gridState.getCell(x, y);
    if (target === colorIndex) return;

    // If in visual mode, constrain flood fill to selection bounds
    const bounds = this.selection.rect;
    const minX = bounds ? bounds.x1 : 0;
    const maxX = bounds ? bounds.x2 : this.width - 1;
    const minY = bounds ? bounds.y1 : 0;
    const maxY = bounds ? bounds.y2 : this.height - 1;

    this.beginGroup('flood');
    const q: Point[] = [{ x, y }];
    const seen = new Set<string>();
    const key = (xx: number, yy: number) => `${xx},${yy}`;
    while (q.length) {
      const { x: cx, y: cy } = q.pop()!;
      // Respect both canvas bounds AND selection bounds
      if (cx < minX || cy < minY || cx > maxX || cy > maxY) continue;
      const k = key(cx, cy);
      if (seen.has(k)) continue;
      seen.add(k);
      if (this.gridState.getCell(cx, cy) !== target) continue;
      this.paintAt(cx, cy, colorIndex);
      q.push({ x: cx + 1, y: cy });
      q.push({ x: cx - 1, y: cy });
      q.push({ x: cx, y: cy + 1 });
      q.push({ x: cx, y: cy - 1 });
    }
    this.endGroup();
  }

  resolveMotion(motion: MotionKind, count = 1, from: Point = this.cursor): MotionResolution {
    const axis = this._axis;
    const steps = Math.max(1, count | 0);
    const axisLength = this.getAxisLength(axis);
    const fixed = this.getAxisFixed(from, axis);
    let pos = this.clampAxisPosition(this.getAxisPosition(from, axis), axis);
    let moved = false;
    let exclusive = false;

    const toPoint = (axisPos: number): Point =>
      axis === 'horizontal' ? { x: axisPos, y: clamp(fixed, 0, this.height - 1) } : { x: clamp(fixed, 0, this.width - 1), y: axisPos };

    const clampLine = (value: number) => clamp(value, 0, axisLength - 1);

    switch (motion) {
      case 'word-next': {
        exclusive = true;
        for (let i = 0; i < steps; i += 1) {
          const next = this.findNextRunStart(axis, fixed, pos);
          if (next === pos) break;
          pos = clampLine(next);
          moved = true;
        }
        break;
      }
      case 'word-prev': {
        for (let i = 0; i < steps; i += 1) {
          const prev = this.findPreviousRunStart(axis, fixed, pos);
          if (prev === pos) break;
          pos = clampLine(prev);
          moved = true;
        }
        break;
      }
      case 'word-end-next': {
        for (let i = 0; i < steps; i += 1) {
          const end = this.findRunEnd(axis, fixed, pos);
          if (end !== pos) moved = true;
          pos = clampLine(end);
          if (i < steps - 1) {
            const next = this.findNextRunStart(axis, fixed, pos);
            if (next === pos) break;
            pos = clampLine(next);
          }
        }
        break;
      }
      case 'word-end-prev': {
        for (let i = 0; i < steps; i += 1) {
          const prevStart = this.findPreviousRunStart(axis, fixed, pos);
          if (prevStart === pos) break;
          const prevEnd = this.findRunEnd(axis, fixed, prevStart);
          pos = clampLine(prevEnd);
          moved = true;
        }
        break;
      }
      case 'line-begin': {
        pos = 0;
        moved = pos !== this.getAxisPosition(from, axis);
        break;
      }
      case 'line-first-nonblank': {
        const first = this.findFirstNonBlank(axis, fixed);
        pos = first ?? 0;
        moved = pos !== this.getAxisPosition(from, axis);
        break;
      }
      case 'line-end': {
        pos = axisLength - 1;
        moved = pos !== this.getAxisPosition(from, axis);
        break;
      }
      case 'canvas-begin': {
        if (axis === 'horizontal') {
          pos = 0;
          moved = pos !== this.getAxisPosition(from, axis);
        } else {
          pos = 0;
          moved = pos !== this.getAxisPosition(from, axis);
        }
        break;
      }
      case 'canvas-end': {
        if (axis === 'horizontal') {
          pos = axisLength - 1;
          moved = pos !== this.getAxisPosition(from, axis);
        } else {
          pos = axisLength - 1;
          moved = pos !== this.getAxisPosition(from, axis);
        }
        break;
      }
      default:
        break;
    }

    return { target: toPoint(pos), axis, exclusive, moved };
  }

  applyMotion(motion: MotionKind, count = 1) {
    const result = this.resolveMotion(motion, count);
    this.cursor.x = result.target.x;
    this.cursor.y = result.target.y;
    if (result.moved) {
      this.emit();
    }
    return result;
  }

  computeOperatorSegment(start: Point, motion: MotionResolution): AxisSegment | null {
    const axis = motion.axis;
    const startPos = this.getAxisPosition(start, axis);
    const targetPos = this.getAxisPosition(motion.target, axis);
    const fixed = this.getAxisFixed(start, axis);
    if (!motion.moved && motion.exclusive) {
      return null;
    }
    let from = startPos;
    let to = targetPos;
    if (motion.exclusive && startPos !== targetPos) {
      if (targetPos > startPos) to = targetPos - 1;
      else if (targetPos < startPos) from = targetPos + 1;
    }
    if (motion.exclusive && startPos === targetPos) {
      return null;
    }
    const segStart = Math.min(from, to);
    const segEnd = Math.max(from, to);
    if (segEnd < segStart) return null;
    return {
      axis,
      fixed,
      start: this.clampAxisPosition(segStart, axis),
      end: this.clampAxisPosition(segEnd, axis),
    };
  }

  createSegmentFromOffsets(axis: Axis, fixed: number, anchor: number, startOffset: number, endOffset: number): AxisSegment {
    const start = anchor + Math.min(startOffset, endOffset);
    const end = anchor + Math.max(startOffset, endOffset);
    return {
      axis,
      fixed,
      start: this.clampAxisPosition(start, axis),
      end: this.clampAxisPosition(end, axis),
    };
  }

  applySegmentValue(segment: AxisSegment, value: number | null, label: string) {
    const { start, end } = segment;
    const len = end - start + 1;
    if (len <= 0) return false;
    this.history.beginGroup(label);
    let changed = false;
    this.forEachSegmentCell(segment, (x, y) => {
      const prev = this.gridState.getCell(x, y);
      if (prev === value) return;
      changed = true;
      this.recordCell({ type: 'cell', x, y, prev, next: value });
      this.gridState.writeCell(x, y, value);
    });
    const grp = this.history.endGroup();
    if (grp) this.emit();
    return changed;
  }

  deleteSegment(segment: AxisSegment) {
    return this.applySegmentValue(segment, null, 'operator.delete');
  }

  paintSegment(segment: AxisSegment, colorIndex: number) {
    return this.applySegmentValue(segment, colorIndex, 'operator.paint');
  }

  yankSegment(segment: AxisSegment) {
    const { axis, fixed, start, end } = segment;
    const len = end - start + 1;
    if (len <= 0) return;
    if (axis === 'horizontal') {
      const cells = [Array.from({ length: len }, (_, i) => this.gridState.getCell(start + i, fixed))];
      this.clipboard.store({ w: len, h: 1, cells });
    } else {
      const cells = Array.from({ length: len }, (_, i) => [this.gridState.getCell(fixed, start + i)]);
      this.clipboard.store({ w: 1, h: len, cells });
    }
  }

  private getAxisLength(axis: Axis) {
    return axis === 'horizontal' ? this.width : this.height;
  }

  private getAxisPosition(point: Point, axis: Axis) {
    return axis === 'horizontal' ? point.x : point.y;
  }

  private getAxisFixed(point: Point, axis: Axis) {
    return axis === 'horizontal' ? point.y : point.x;
  }

  private clampAxisPosition(pos: number, axis: Axis) {
    const length = this.getAxisLength(axis);
    return clamp(pos, 0, Math.max(0, length - 1));
  }

  private getAxisCell(axis: Axis, fixed: number, pos: number) {
    if (axis === 'horizontal') {
      return this.gridState.getCell(pos, clamp(fixed, 0, this.height - 1));
    }
    return this.gridState.getCell(clamp(fixed, 0, this.width - 1), pos);
  }

  private findRunEnd(axis: Axis, fixed: number, pos: number) {
    let idx = this.clampAxisPosition(pos, axis);
    const length = this.getAxisLength(axis);
    const type = this.getAxisCell(axis, fixed, idx);
    while (idx + 1 < length) {
      const nextIdx = idx + 1;
      const nextType = this.getAxisCell(axis, fixed, nextIdx);
      if (nextType !== type) break;
      idx = nextIdx;
    }
    return idx;
  }

  private findRunStart(axis: Axis, fixed: number, pos: number) {
    let idx = this.clampAxisPosition(pos, axis);
    const type = this.getAxisCell(axis, fixed, idx);
    while (idx - 1 >= 0) {
      const prevIdx = idx - 1;
      const prevType = this.getAxisCell(axis, fixed, prevIdx);
      if (prevType !== type) break;
      idx = prevIdx;
    }
    return idx;
  }

  private findNextRunStart(axis: Axis, fixed: number, pos: number) {
    const end = this.findRunEnd(axis, fixed, pos);
    const length = this.getAxisLength(axis);
    if (end >= length - 1) return pos;
    return end + 1;
  }

  private findPreviousRunStart(axis: Axis, fixed: number, pos: number) {
    const start = this.findRunStart(axis, fixed, pos);
    if (start <= 0) return pos;
    return this.findRunStart(axis, fixed, start - 1);
  }

  private findFirstNonBlank(axis: Axis, fixed: number) {
    const length = this.getAxisLength(axis);
    for (let i = 0; i < length; i += 1) {
      if (this.getAxisCell(axis, fixed, i) != null) return i;
    }
    return null;
  }

  private forEachSegmentCell(segment: AxisSegment, fn: (x: number, y: number) => void) {
    const { axis, start, end, fixed } = segment;
    if (axis === 'horizontal') {
      const y = clamp(fixed, 0, this.height - 1);
      for (let x = start; x <= end; x += 1) {
        const cx = clamp(x, 0, this.width - 1);
        fn(cx, y);
      }
      return;
    }
    const x = clamp(fixed, 0, this.width - 1);
    for (let y = start; y <= end; y += 1) {
      const cy = clamp(y, 0, this.height - 1);
      fn(x, cy);
    }
  }

  private paintAt(x: number, y: number, colorIndex: number | null) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const prev = this.gridState.getCell(x, y);
    if (prev === colorIndex) return;
    this.recordCell({ type: 'cell', x, y, prev, next: colorIndex });
    this.gridState.writeCell(x, y, colorIndex);
  }

  private recordCell(entry: HistoryCell) {
    this.history.record(entry);
  }

  private applyGroup(group: HistoryGroup, key: 'prev' | 'next') {
    for (let i = 0; i < group.items.length; i++) {
      const it = group.items[i];
      this.gridState.writeCell(it.x, it.y, (it as any)[key] ?? null);
    }
    this.emit();
  }
}
