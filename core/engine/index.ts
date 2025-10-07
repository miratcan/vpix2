/* eslint-disable @typescript-eslint/member-ordering */
import { dispatchKey } from '../keymap';
import { clamp } from '../util';
import { floodFill as floodFillTool } from '../tools/flood-fill';
import { fillRect as fillRectTool } from '../tools/fill-rect';
import { drawLine as drawLineTool } from '../tools/line';
import { strokeRect as strokeRectTool } from '../tools/stroke-rect';
import { fillEllipse as fillEllipseTool, strokeEllipse as strokeEllipseTool } from '../tools/circle';
import type { ToolOperation } from '../tools/types';
import { ClipboardBuffer } from './clipboard';
import { EngineEvents } from './events';
import { GridState } from './grid-state';
import { HistoryManager, type HistoryCell, type HistoryGroup } from './history';
import { SelectionManager } from './selection';
import { CountBuffer, CursorManager, ModeManager, PrefixManager } from './state';
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
  private readonly cursorManager = new CursorManager();
  private readonly modeManager = new ModeManager();
  private readonly prefixManager = new PrefixManager();
  private readonly countBuffer = new CountBuffer();

  private _palette: string[];
  private _currentColorIndex = 2;
  private _axis: Axis = 'horizontal';
  private _pendingOperator: PendingOperator | null = null;
  private lastAction: (() => void) | null = null;

  get cursor(): Point {
    return this.cursorManager.position;
  }

  set cursor(point: Point) {
    const x = clamp(point.x, 0, Math.max(0, this.width - 1));
    const y = clamp(point.y, 0, Math.max(0, this.height - 1));
    this.cursorManager.setPosition(x, y);
  }
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
    return this.modeManager.current;
  }

  get selection() {
    return this.selectionManager.snapshot;
  }

  get prefix() {
    return this.prefixManager.current;
  }

  setPrefix(prefix: 'g' | 'r' | null) {
    this.prefixManager.set(prefix);
  }

  clearPrefix() {
    this.prefixManager.clear();
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
    return this.countBuffer.value();
  }

  hasCount() {
    return this.countBuffer.hasValue;
  }

  clearCount() {
    this.countBuffer.clear();
  }

  pushCountDigit(d: string) {
    const changed = this.countBuffer.pushDigit(d);
    if (changed) this.emit();
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
    const changed = this.modeManager.set(mode);
    if (changed) this.emit();
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
    this.cursorManager.clampToBounds(this.width, this.height);
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
      const stepMoved = this.cursorManager.moveBy(dx, dy, this.width, this.height);
      if (!stepMoved) continue;
      moved = true;
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
    this.cursorManager.clampToBounds(this.width, this.height);
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
    const operations = fillRectTool(rect, colorIndex, (x, y) => this.gridState.getCell(x, y));
    this.applyToolOperations('fill', operations);
  }

  strokeRectSelection(colorIndex: number = this._currentColorIndex) {
    const rect = this.selection.rect;
    if (!rect) return;
    const operations = strokeRectTool(rect, colorIndex, (x, y) => this.gridState.getCell(x, y));
    this.applyToolOperations('rect', operations);
  }

  strokeCircleSelection(colorIndex: number = this._currentColorIndex) {
    const rect = this.selection.rect;
    if (!rect) return;
    const operations = strokeEllipseTool(rect, colorIndex, (x, y) => this.gridState.getCell(x, y));
    this.applyToolOperations('ellipse-stroke', operations);
  }

  fillCircleSelection(colorIndex: number = this._currentColorIndex) {
    const rect = this.selection.rect;
    if (!rect) return;
    const operations = fillEllipseTool(rect, colorIndex, (x, y) => this.gridState.getCell(x, y));
    this.applyToolOperations('ellipse-fill', operations);
  }

  drawLine(a: Point | null, b: Point | null, colorIndex: number = this._currentColorIndex) {
    if (!a || !b) return;
    const operations = drawLineTool(a, b, colorIndex, (x, y) => this.gridState.getCell(x, y));
    this.applyToolOperations('line', operations);
  }

  floodFill(x: number, y: number, colorIndex: number = this._currentColorIndex) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const operations = floodFillTool(
      { x, y },
      colorIndex,
      (cx, cy) => this.gridState.getCell(cx, cy),
      { width: this.width, height: this.height, bounds: this.selection.rect ?? null },
    );
    this.applyToolOperations('flood', operations);
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
    this.cursorManager.setPosition(result.target.x, result.target.y);
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

  private applyToolOperations(label: string, operations: ToolOperation[]) {
    if (!operations.length) return;
    this.beginGroup(label);
    for (const op of operations) {
      this.paintAt(op.x, op.y, op.value);
    }
    this.endGroup();
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
