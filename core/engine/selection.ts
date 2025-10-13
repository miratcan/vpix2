import type { Point, Rect } from './types';

export type SelectionState = {
  active: boolean;
  anchor: Point | null;
  rect: Rect | null;
};

export class SelectionManager {
  private state: SelectionState = { active: false, anchor: null, rect: null };

  get snapshot(): SelectionState {
    return this.state;
  }

  get rect(): Rect | null {
    return this.state.rect;
  }

  get active(): boolean {
    return this.state.active;
  }

  enter(anchor: Point): Rect {
    const rect = { x1: anchor.x, y1: anchor.y, x2: anchor.x, y2: anchor.y };
    this.state = { active: true, anchor: { ...anchor }, rect };
    return rect;
  }

  exit(): Rect | null {
    const prev = this.state.rect;
    this.state = { active: false, anchor: null, rect: null };
    return prev;
  }

  update(cursor: Point): Rect | null {
    if (!this.state.active || !this.state.anchor) return null;
    const prev = this.state.rect;
    const { anchor } = this.state;
    const x1 = Math.min(anchor.x, cursor.x);
    const y1 = Math.min(anchor.y, cursor.y);
    const x2 = Math.max(anchor.x, cursor.x);
    const y2 = Math.max(anchor.y, cursor.y);
    const next = { x1, y1, x2, y2 };
    this.state = { ...this.state, rect: next };
    if (!prev) return next;
    return {
      x1: Math.min(prev.x1, next.x1),
      y1: Math.min(prev.y1, next.y1),
      x2: Math.max(prev.x2, next.x2),
      y2: Math.max(prev.y2, next.y2),
    };
  }
}
