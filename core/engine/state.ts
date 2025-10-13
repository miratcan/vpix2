import { clamp } from '../util';
import { MODES } from './types';

import type { Mode, Point } from './types';

export class PrefixManager {
  private value: 'g' | 'r' | null = null;

  get current(): 'g' | 'r' | null {
    return this.value;
  }

  set(prefix: 'g' | 'r' | null) {
    this.value = prefix;
  }

  clear() {
    this.value = null;
  }
}

export class ModeManager {
  private value: Mode = MODES.NORMAL;

  get current(): Mode {
    return this.value;
  }

  set(mode: Mode) {
    if (mode !== MODES.NORMAL && mode !== MODES.VISUAL) return false;
    if (this.value === mode) return false;
    this.value = mode;
    return true;
  }
}

export class CountBuffer {
  private buffer = '';

  get hasValue(): boolean {
    return this.buffer.length > 0;
  }

  clear() {
    this.buffer = '';
  }

  pushDigit(digit: string) {
    if (!/\d/.test(digit)) return false;
    if (this.buffer === '' && digit === '0') return false;
    this.buffer += digit;
    return true;
  }

  value(defaultValue = 1) {
    const n = parseInt(this.buffer || String(defaultValue), 10);
    if (Number.isNaN(n)) return defaultValue;
    return clamp(n, 1, 9999);
  }
}

export class CursorManager {
  private readonly point: Point = { x: 0, y: 0 };

  get position(): Point {
    return this.point;
  }

  /** Convenience getter for x coordinate */
  get x(): number {
    return this.point.x;
  }

  /** Convenience getter for y coordinate */
  get y(): number {
    return this.point.y;
  }

  setPosition(x: number, y: number) {
    this.point.x = x;
    this.point.y = y;
  }

  clampToBounds(width: number, height: number) {
    this.point.x = clamp(this.point.x, 0, Math.max(0, width - 1));
    this.point.y = clamp(this.point.y, 0, Math.max(0, height - 1));
  }

  moveBy(dx: number, dy: number, width: number, height: number) {
    const nextX = clamp(this.point.x + dx, 0, Math.max(0, width - 1));
    const nextY = clamp(this.point.y + dy, 0, Math.max(0, height - 1));
    if (nextX === this.point.x && nextY === this.point.y) return false;
    this.point.x = nextX;
    this.point.y = nextY;
    return true;
  }
}
