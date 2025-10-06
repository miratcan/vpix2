import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import VPixEngine, { MODES } from '../core/engine';
import { getPaletteByName } from '../core/palettes';

describe('VPixEngine', () => {
  const pico = getPaletteByName('pico-8')!;

  it('initializes with correct defaults', () => {
    const eng = new VPixEngine({ width: 8, height: 8, palette: pico.colors });
    assert.equal(eng.width, 8);
    assert.equal(eng.height, 8);
    assert.equal(eng.mode, MODES.NORMAL);
    assert.deepEqual(eng.cursor, { x: 0, y: 0 });
    assert.equal(eng.grid.length, 8);
    assert.equal(eng.grid[0].length, 8);
  });

  it('moves cursor with hjkl and clamps bounds', () => {
    const eng = new VPixEngine({ width: 3, height: 2, palette: pico.colors });
    eng.handleKey({ key: 'l' });
    eng.handleKey({ key: 'l' });
    eng.handleKey({ key: 'l' });
    assert.deepEqual(eng.cursor, { x: 2, y: 0 });
    eng.handleKey({ key: 'j' });
    eng.handleKey({ key: 'j' });
    assert.deepEqual(eng.cursor, { x: 2, y: 1 });
    eng.handleKey({ key: 'h' });
    eng.handleKey({ key: 'k' });
    assert.deepEqual(eng.cursor, { x: 1, y: 0 });
  });

  it('count prefix repeats actions', () => {
    const eng = new VPixEngine({ width: 10, height: 1, palette: pico.colors });
    eng.handleKey({ key: '3' });
    eng.handleKey({ key: '2' });
    eng.handleKey({ key: 'l' });
    assert.deepEqual(eng.cursor, { x: 9, y: 0 });
  });

  it('insert mode paints as it moves', () => {
    const eng = new VPixEngine({ width: 3, height: 1, palette: pico.colors });
    eng.handleKey({ key: 'i' });
    assert.equal(eng.mode, MODES.INSERT);
    eng.paint();
    eng.handleKey({ key: 'l' });
    eng.handleKey({ key: 'l' });
    assert.ok(eng.grid[0][0] != null);
    assert.ok(eng.grid[0][1] != null);
    assert.ok(eng.grid[0][2] != null);
    eng.handleKey({ key: 'Escape' });
    assert.equal(eng.mode, MODES.NORMAL);
  });

  it('erases with x in normal mode and Backspace in insert', () => {
    const eng = new VPixEngine({ width: 2, height: 1, palette: pico.colors });
    eng.paint();
    assert.ok(eng.grid[0][0] != null);
    eng.handleKey({ key: 'x' });
    assert.equal(eng.grid[0][0], null);
    eng.handleKey({ key: 'i' });
    eng.paint();
    assert.ok(eng.grid[0][0] != null);
    eng.handleKey({ key: 'Backspace' });
    assert.equal(eng.grid[0][0], null);
  });

  it('undo/redo works for paint/erase', () => {
    const eng = new VPixEngine({ width: 1, height: 1, palette: pico.colors });
    eng.paint();
    const colorIndex1 = eng.grid[0][0];
    eng.erase();
    assert.equal(eng.grid[0][0], null);
    eng.undo();
    assert.equal(eng.grid[0][0], colorIndex1);
    eng.redo();
    assert.equal(eng.grid[0][0], null);
  });

  it('serialize/deserialize roundtrips', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    eng.setColorIndex(5);
    eng.paint();
    eng.move(1, 0);
    eng.setColorIndex(7);
    eng.paint();
    const json = eng.serialize();
    const clone = VPixEngine.deserialize(json);
    assert.equal(clone.width, 2);
    assert.equal(clone.height, 2);
    assert.equal(clone.grid[0][0], 5);
    assert.equal(clone.grid[0][1], 7);
  });

  it('[count] c selects color index', () => {
    const eng = new VPixEngine({ width: 1, height: 1, palette: pico.colors });
    eng.handleKey({ key: '3' });
    eng.handleKey({ key: 'g' });
    eng.handleKey({ key: 'c' });
    assert.equal(eng.currentColorIndex, 2);
  });

  it('gt/gT cycles palette like Vim tabs', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    const start = eng.currentColorIndex;
    eng.handleKey({ key: 'g' });
    eng.handleKey({ key: 't' });
    assert.equal(eng.currentColorIndex, (start + 1) % eng.palette.length);
    eng.handleKey({ key: 'g' });
    eng.handleKey({ key: 'T' });
    assert.equal(eng.currentColorIndex, start);
  });

  it('Ctrl-^ toggles last color (Ctrl+6)', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    eng.setColorIndex(4);
    eng.setColorIndex(1);
    eng.handleKey({ key: '6', ctrlKey: true });
    assert.equal(eng.currentColorIndex, 4);
    eng.handleKey({ key: '6', ctrlKey: true });
    assert.equal(eng.currentColorIndex, 1);
  });

  it('r + digit paints once without changing current color', () => {
    const eng = new VPixEngine({ width: 1, height: 1, palette: pico.colors });
    const before = eng.currentColorIndex;
    eng.handleKey({ key: 'r' });
    eng.handleKey({ key: '1' });
    assert.ok(eng.grid[0][0] != null);
    assert.equal(eng.currentColorIndex, before);
  });

  it('axis defaults to horizontal and toggles with Tab', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    assert.equal((eng as any).axis, 'horizontal');
    eng.handleKey({ key: 'Tab' });
    assert.equal((eng as any).axis, 'vertical');
    eng.handleKey({ key: 'Tab' });
    assert.equal((eng as any).axis, 'horizontal');
  });

  it('axis-aware word motions respect run boundaries', () => {
    const eng = new VPixEngine({ width: 6, height: 6, palette: pico.colors });
    const row = eng.grid[0];
    [row[0], row[1], row[2], row[3], row[4], row[5]] = [1, 1, null, null, 2, 2];

    eng.cursor = { x: 0, y: 0 };
    eng.handleKey({ key: 'w' });
    assert.equal(eng.cursor.x, 2);
    eng.handleKey({ key: 'w' });
    assert.equal(eng.cursor.x, 4);
    eng.handleKey({ key: 'b' });
    assert.equal(eng.cursor.x, 2);
    eng.handleKey({ key: 'e' });
    assert.equal(eng.cursor.x, 3);
    eng.cursor = { x: 4, y: 0 };
    eng.handleKey({ key: 'g' });
    eng.handleKey({ key: 'e' });
    assert.equal(eng.cursor.x, 3);

    for (let y = 0; y < 6; y += 1) {
      eng.grid[y][0] = y < 2 ? 7 : y < 4 ? null : 5;
    }
    eng.setAxis('vertical');
    eng.cursor = { x: 0, y: 0 };
    eng.handleKey({ key: 'w' });
    assert.equal(eng.cursor.y, 2);
    eng.handleKey({ key: 'w' });
    assert.equal(eng.cursor.y, 4);
    eng.handleKey({ key: 'b' });
    assert.equal(eng.cursor.y, 2);
    eng.handleKey({ key: 'e' });
    assert.equal(eng.cursor.y, 3);
    eng.cursor = { x: 0, y: 4 };
    eng.handleKey({ key: 'g' });
    eng.handleKey({ key: 'e' });
    assert.equal(eng.cursor.y, 3);
  });

  it('gg and G jump to canvas bounds based on axis', () => {
    const eng = new VPixEngine({ width: 5, height: 4, palette: pico.colors });
    eng.cursor = { x: 3, y: 2 };
    eng.handleKey({ key: 'g' });
    eng.handleKey({ key: 'g' });
    assert.deepEqual(eng.cursor, { x: 0, y: 2 });
    eng.handleKey({ key: 'G' });
    assert.deepEqual(eng.cursor, { x: 4, y: 2 });

    eng.setAxis('vertical');
    eng.cursor = { x: 2, y: 1 };
    eng.handleKey({ key: 'g' });
    eng.handleKey({ key: 'g' });
    assert.deepEqual(eng.cursor, { x: 2, y: 0 });
    eng.handleKey({ key: 'G' });
    assert.deepEqual(eng.cursor, { x: 2, y: 3 });
  });

  it('operator motions delete and change along axis', () => {
    const eng = new VPixEngine({ width: 6, height: 1, palette: pico.colors });
    const row = eng.grid[0];
    [row[0], row[1], row[2], row[3], row[4], row[5]] = [1, 1, null, null, 2, 2];

    eng.cursor = { x: 0, y: 0 };
    eng.handleKey({ key: 'd' });
    eng.handleKey({ key: 'w' });
    assert.deepEqual(row.slice(0, 6), [null, null, null, null, 2, 2]);
    assert.equal(eng.cursor.x, 0);

    eng.handleKey({ key: 'w' });
    eng.handleKey({ key: '.' });
    assert.deepEqual(row.slice(0, 6), [null, null, null, null, null, null]);

    const engChange = new VPixEngine({ width: 4, height: 1, palette: pico.colors });
    const rowChange = engChange.grid[0];
    [rowChange[0], rowChange[1], rowChange[2], rowChange[3]] = [3, 3, 4, 4];
    engChange.cursor = { x: 0, y: 0 };
    engChange.handleKey({ key: 'c' });
    engChange.handleKey({ key: 'w' });
    assert.deepEqual(rowChange.slice(0, 4), [null, null, 4, 4]);
    assert.equal(engChange.mode, MODES.INSERT);

    const engDeleteToEnd = new VPixEngine({ width: 4, height: 1, palette: pico.colors });
    const rowEnd = engDeleteToEnd.grid[0];
    [rowEnd[0], rowEnd[1], rowEnd[2], rowEnd[3]] = [5, 5, 6, 6];
    engDeleteToEnd.cursor = { x: 1, y: 0 };
    engDeleteToEnd.handleKey({ key: 'D' });
    assert.deepEqual(rowEnd.slice(0, 4), [5, null, null, null]);
  });

  it('repeat last action replays toggles and deletes', () => {
    const eng = new VPixEngine({ width: 4, height: 1, palette: pico.colors });
    eng.handleKey({ key: ' ' });
    eng.cursor = { x: 1, y: 0 };
    eng.handleKey({ key: '.' });
    assert.ok(eng.grid[0][1] != null);

    eng.grid[0].splice(0, 4, 1, 1, null, null);
    eng.cursor = { x: 0, y: 0 };
    eng.handleKey({ key: 'd' });
    eng.handleKey({ key: 'w' });
    eng.cursor = { x: 2, y: 0 };
    eng.handleKey({ key: '.' });
    assert.deepEqual(eng.grid[0].slice(0, 4), [null, null, null, null]);
  });

  it('u and Ctrl-r act as undo/redo aliases', () => {
    const eng = new VPixEngine({ width: 2, height: 1, palette: pico.colors });
    eng.paint();
    eng.handleKey({ key: 'u' });
    assert.equal(eng.grid[0][0], null);
    eng.handleKey({ key: 'r', ctrlKey: true });
    assert.ok(eng.grid[0][0] != null);
  });
});
