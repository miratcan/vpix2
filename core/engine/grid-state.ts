import { clamp } from '../util';

export class GridState {
  private _width: number;
  private _height: number;
  private _cells: Array<Array<number | null>>;

  constructor(width: number, height: number) {
    this._width = clamp(width | 0, 1, 256);
    this._height = clamp(height | 0, 1, 256);
    this._cells = Array.from({ length: this._height }, () => Array<number | null>(this._width).fill(null));
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  get cells() {
    return this._cells;
  }

  getCell(x: number, y: number) {
    return this._cells[y]?.[x] ?? null;
  }

  writeCell(x: number, y: number, value: number | null | undefined) {
    if (x < 0 || y < 0 || x >= this._width || y >= this._height) return;
    this._cells[y][x] = value ?? null;
  }

  resize(width: number, height: number) {
    const w = clamp(width | 0, 1, 256);
    const h = clamp(height | 0, 1, 256);
    if (w === this._width && h === this._height) {
      return false;
    }
    const next = Array.from({ length: h }, () => Array<number | null>(w).fill(null));
    const copyH = Math.min(this._height, h);
    const copyW = Math.min(this._width, w);
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        next[y][x] = this._cells[y][x];
      }
    }
    this._width = w;
    this._height = h;
    this._cells = next;
    return true;
  }

  cloneGrid() {
    return this._cells.map((row) => row.slice());
  }

  load(snapshot: { width: number; height: number; grid: Array<Array<number | null>> }) {
    const { width, height, grid } = snapshot;
    const w = clamp(width | 0, 1, 256);
    const h = clamp(height | 0, 1, 256);
    this._width = w;
    this._height = h;
    this._cells = Array.from({ length: h }, (_, y) => {
      const row = grid[y] || [];
      return Array.from({ length: w }, (_, x) => row[x] ?? null);
    });
  }
}
