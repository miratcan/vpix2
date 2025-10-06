export type ClipboardData = { w: number; h: number; cells: Array<Array<string | null>> };

export class ClipboardBuffer {
  private buffer: ClipboardData | null = null;

  get snapshot() {
    return this.buffer;
  }

  store(data: ClipboardData) {
    this.buffer = {
      w: data.w,
      h: data.h,
      cells: data.cells.map((row) => row.slice()),
    };
  }

  clear() {
    this.buffer = null;
  }

  rotateCW() {
    if (!this.buffer) return;
    const { w, h, cells } = this.buffer;
    const out = Array.from({ length: w }, () => Array<string | null>(h).fill(null));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        out[x][h - 1 - y] = cells[y][x];
      }
    }
    this.buffer = { w: h, h: w, cells: out };
  }

  rotateCCW() {
    if (!this.buffer) return;
    const { w, h, cells } = this.buffer;
    const out = Array.from({ length: w }, () => Array<string | null>(h).fill(null));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        out[w - 1 - x][y] = cells[y][x];
      }
    }
    this.buffer = { w: h, h: w, cells: out };
  }
}
