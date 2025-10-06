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
    assert.ok(eng.grid[0][0]);
    assert.ok(eng.grid[0][1]);
    assert.ok(eng.grid[0][2]);
    eng.handleKey({ key: 'Escape' });
    assert.equal(eng.mode, MODES.NORMAL);
  });

  it('erases with x in normal mode and Backspace in insert', () => {
    const eng = new VPixEngine({ width: 2, height: 1, palette: pico.colors });
    eng.paint();
    assert.ok(eng.grid[0][0]);
    eng.handleKey({ key: 'x' });
    assert.equal(eng.grid[0][0], null);
    eng.handleKey({ key: 'i' });
    eng.paint();
    assert.ok(eng.grid[0][0]);
    eng.handleKey({ key: 'Backspace' });
    assert.equal(eng.grid[0][0], null);
  });

  it('undo/redo works for paint/erase', () => {
    const eng = new VPixEngine({ width: 1, height: 1, palette: pico.colors });
    eng.paint('#ff0000');
    const color1 = eng.grid[0][0];
    eng.erase();
    assert.equal(eng.grid[0][0], null);
    eng.undo();
    assert.equal(eng.grid[0][0], color1);
    eng.redo();
    assert.equal(eng.grid[0][0], null);
  });

  it('serialize/deserialize roundtrips', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    eng.paint('#123456');
    eng.move(1, 0);
    eng.paint('#abcdef');
    const json = eng.serialize();
    const clone = VPixEngine.deserialize(json);
    assert.equal(clone.width, 2);
    assert.equal(clone.height, 2);
    assert.equal(clone.grid[0][0], '#123456');
    assert.equal(clone.grid[0][1], '#abcdef');
  });

  it('[count] c selects color index', () => {
    const eng = new VPixEngine({ width: 1, height: 1, palette: pico.colors });
    eng.handleKey({ key: '3' });
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
    assert.ok(eng.grid[0][0]);
    assert.equal(eng.currentColorIndex, before);
  });
});
