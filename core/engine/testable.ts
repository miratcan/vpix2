import VPixEngine from './index';
import type { Axis } from './types';

const CELL_TOKEN = /[C ][\d.]/g;

function dedent(str: string) {
  const lines = str.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => (line.match(/^\s*/)?.[0] ?? '').length);
  const minIndent = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(Math.min(minIndent, line.length))).join('\n');
}

function parseValueChar(value: string, row: number, col: number): number | null {
  if (value === '.') return null;
  if (/\d/.test(value)) return Number(value);
  throw new Error(`Invalid cell value '${value}' at row ${row + 1}, column ${col + 1}`);
}

type GridMeta = { axis?: Axis; colorIndex?: number; width?: number; height?: number };
type KeySpec =
  | string
  | {
      key: string;
      ctrlKey?: boolean;
      shiftKey?: boolean;
      altKey?: boolean;
      metaKey?: boolean;
    };

export default class TestableEngine extends VPixEngine {
  static parseState(text: string): {
    grid: (number | null)[][];
    cursor?: { x: number; y: number };
    meta: GridMeta;
  } {
    const rawLines = dedent(text).split(/\r?\n/);
    let idx = 0;
    const meta: GridMeta = {};
    const directiveRe = /axis\s*:\s*(horizontal|vertical)\s*(?:,\s*color(?:Index)?\s*:\s*(\d+))?/i;
    const directiveMatch = directiveRe.exec(rawLines[0] || '');
    if (directiveMatch) {
      meta.axis = directiveMatch[1] as Axis;
      if (directiveMatch[2]) meta.colorIndex = Number(directiveMatch[2]);
      idx = 1;
      if (rawLines[idx] !== undefined && rawLines[idx].trim() === '') idx += 1;
    }

    const lines = rawLines.slice(idx).filter((line) => line.trim().length > 0);
    const grid: (number | null)[][] = [];
    let cursor: { x: number; y: number } | undefined;
    let expectedWidth: number | undefined;

    lines.forEach((line, rowIndex) => {
      if (line[0] !== ' ' && line[0] !== 'C') {
        throw new Error(`Line ${rowIndex + 1} must begin with a space or 'C' overlay`);
      }
      const tokens = Array.from(line.matchAll(CELL_TOKEN)).map((match) => match[0]);
      const remainder = line.replace(CELL_TOKEN, '').trim();
      if (tokens.length === 0) {
        throw new Error(`Line ${rowIndex + 1} does not contain any cells`);
      }
      if (remainder.length > 0) {
        throw new Error(`Invalid characters on line ${rowIndex + 1}: '${remainder}'`);
      }
      if (expectedWidth == null) {
        expectedWidth = tokens.length;
      } else if (tokens.length !== expectedWidth) {
        throw new Error(`Line ${rowIndex + 1} has ${tokens.length} cells; expected ${expectedWidth}`);
      }
      const row: (number | null)[] = [];
      tokens.forEach((token, colIndex) => {
        const overlay = token[0];
        const valueChar = token[1];
        if (overlay !== ' ' && overlay !== 'C') {
          throw new Error(`Invalid overlay '${overlay}' at row ${rowIndex + 1}, column ${colIndex + 1}`);
        }
        const value = parseValueChar(valueChar, rowIndex, colIndex);
        row.push(value);
        if (overlay === 'C') {
          if (cursor) {
            throw new Error('Multiple cursor markers found; only one cursor allowed per grid state');
          }
          cursor = { x: colIndex, y: grid.length };
        }
      });
      grid.push(row);
    });

    meta.width = expectedWidth ?? 0;
    meta.height = grid.length;

    return { grid, cursor, meta };
  }

  static serializeState(engine: VPixEngine): string {
    const { axis, currentColorIndex: colorIndex } = engine;
    const directive = `Axis: ${axis}, Color: ${colorIndex}`;
    const lines: string[] = [directive, ''];
    for (let y = 0; y < engine.height; y += 1) {
      let line = '';
      for (let x = 0; x < engine.width; x += 1) {
        const overlay = engine.cursor.x === x && engine.cursor.y === y ? 'C' : ' ';
        const value = engine.grid[y]?.[x];
        const valueChar = value == null ? '.' : String(value);
        line += `${overlay}${valueChar}`;
        if (x < engine.width - 1) line += '  ';
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  setStateFromString(text: string) {
    const { grid, cursor, meta } = TestableEngine.parseState(text);
    if (meta.axis) this.setAxis(meta.axis);
    if (typeof meta.colorIndex === 'number') this.setColorIndex(meta.colorIndex);
    const h = Math.min(this.height, grid.length);
    const w = Math.min(this.width, grid[0]?.length ?? 0);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        (this as any).gridState.writeCell(x, y, grid[y][x]);
      }
    }
    if (cursor) {
      this.cursor = cursor;
    }
  }

  getStateAsString(): string {
    return TestableEngine.serializeState(this);
  }

  handleKeys(keys: KeySpec[]) {
    keys.forEach((spec) => {
      if (typeof spec === 'string') {
        this.handleKey({ key: spec });
      } else {
        this.handleKey(spec);
      }
    });
  }
}
