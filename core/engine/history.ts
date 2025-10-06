import type { Rect } from './types';

export type HistoryCell = {
  type: 'cell';
  x: number;
  y: number;
  prev: string | null | undefined;
  next: string | null | undefined;
};

export type HistoryGroup = {
  type: 'group';
  label: string;
  items: HistoryCell[];
  bounds: Rect | null;
};

export type HistoryEntry = HistoryCell | HistoryGroup;

function expandBounds(bounds: Rect | null, x: number, y: number): Rect {
  if (!bounds) {
    return { x1: x, y1: y, x2: x, y2: y };
  }
  return {
    x1: Math.min(bounds.x1, x),
    y1: Math.min(bounds.y1, y),
    x2: Math.max(bounds.x2, x),
    y2: Math.max(bounds.y2, y),
  };
}

export class HistoryManager {
  private readonly limit: number;
  private readonly history: HistoryEntry[] = [];
  private redo: HistoryEntry[] = [];
  private group: { label: string; items: HistoryCell[]; bounds: Rect | null } | null = null;

  constructor(limit = 1000) {
    this.limit = Math.max(1, limit);
  }

  record(entry: HistoryCell) {
    if (this.group) {
      this.group.items.push(entry);
      this.group.bounds = expandBounds(this.group.bounds, entry.x, entry.y);
      return;
    }
    this.commit(entry, true);
  }

  beginGroup(label = '') {
    if (this.group) return;
    this.group = { label, items: [], bounds: null };
  }

  endGroup(): HistoryGroup | null {
    if (!this.group) return null;
    const grp = this.group;
    this.group = null;
    if (grp.items.length === 0) return null;
    const entry: HistoryGroup = { type: 'group', label: grp.label, items: grp.items, bounds: grp.bounds };
    this.commit(entry, true);
    return entry;
  }

  undo(): HistoryEntry | null {
    const entry = this.history.pop();
    if (!entry) return null;
    this.redo.push(entry);
    return entry;
  }

  redoEntry(): HistoryEntry | null {
    const entry = this.redo.pop();
    if (!entry) return null;
    this.commit(entry, false);
    return entry;
  }

  clearRedo() {
    this.redo = [];
  }

  private commit(entry: HistoryEntry, clearRedo: boolean) {
    this.history.push(entry);
    if (this.history.length > this.limit) {
      this.history.shift();
    }
    if (clearRedo) this.clearRedo();
  }
}
