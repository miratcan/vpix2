import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import VPixEngine, { MODES } from '../core/engine';
import TestableEngine from '../core/engine/testable';
import { expectEngineToMatchText, setEngineFromText } from './helpers/grid-helpers';
import { getPaletteByName } from '../core/palettes';

describe('VPixEngine', () => {
  const pico = getPaletteByName('pico-8')!;

  const press = (
    engine: VPixEngine,
    ...keys: Array<string | { key: string; ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean; altKey?: boolean }>
  ) => {
    const handler = (engine as any).handleKeys as ((keys: typeof keys) => void) | undefined;
    if (typeof handler === 'function') {
      handler.call(engine, keys);
      return;
    }
    keys.forEach((k) => {
      if (typeof k === 'string') engine.handleKey({ key: k });
      else engine.handleKey(k);
    });
  };

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
    press(eng, 'l', 'l', 'l');
    assert.deepEqual(eng.cursor, { x: 2, y: 0 });
    press(eng, 'j', 'j');
    assert.deepEqual(eng.cursor, { x: 2, y: 1 });
    press(eng, 'h', 'k');
    assert.deepEqual(eng.cursor, { x: 1, y: 0 });
  });

  it('count prefix repeats actions', () => {
    const eng = new VPixEngine({ width: 10, height: 1, palette: pico.colors });
    press(eng, '3', '2', 'l');
    assert.deepEqual(eng.cursor, { x: 9, y: 0 });
  });

  it('erases with x in normal mode', () => {
    const eng = new VPixEngine({ width: 2, height: 1, palette: pico.colors });
    eng.paint();
    assert.ok(eng.grid[0][0] != null);
    press(eng, 'x');
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
    press(eng, '3', 'g', 'c');
    assert.equal(eng.currentColorIndex, 2);
  });

  it('gt/gT cycles palette like Vim tabs', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    const start = eng.currentColorIndex;
    press(eng, 'g', 't');
    assert.equal(eng.currentColorIndex, (start + 1) % eng.palette.length);
    press(eng, 'g', 'T');
    assert.equal(eng.currentColorIndex, start);
  });

  it('Ctrl-^ toggles last color', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    eng.setColorIndex(4);
    eng.setColorIndex(1);
    press(eng, { key: '^', ctrlKey: true, shiftKey: true });
    assert.equal(eng.currentColorIndex, 4);
    press(eng, { key: '^', ctrlKey: true, shiftKey: true });
    assert.equal(eng.currentColorIndex, 1);
  });

  it('axis defaults to horizontal and toggles with Tab', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    assert.equal((eng as any).axis, 'horizontal');
    press(eng, 'Tab');
    assert.equal((eng as any).axis, 'vertical');
    press(eng, 'Tab');
    assert.equal((eng as any).axis, 'horizontal');
  });

  it('axis-aware word motions respect run boundaries', () => {
    const eng = new TestableEngine({ width: 6, height: 6, palette: pico.colors });
    // Horizontal runs with explicit cursor using C
    setEngineFromText(eng, `
      Axis: horizontal, Color: 2

      C1  1  .  .  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
    `);
    assert.deepEqual(eng.grid[0].slice(0, 6), [1, 1, null, null, 2, 2]);
    assert.deepEqual(eng.cursor, { x: 0, y: 0 });
    press(eng, 'w');
    assert.deepEqual(eng.cursor, { x: 2, y: 0 });
    expectEngineToMatchText(eng, `
      Axis: horizontal

       1  1  .  C.  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
    `, { checkCursor: false });
    press(eng, 'w');
    assert.deepEqual(eng.cursor, { x: 4, y: 0 });
    expectEngineToMatchText(eng, `
      Axis: horizontal

       1  1  .  .  C2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
    `, { checkCursor: false });
    press(eng, 'b');
    assert.deepEqual(eng.cursor, { x: 2, y: 0 });
    expectEngineToMatchText(eng, `
      Axis: horizontal

       1  1  C.  .  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
    `, { checkCursor: false });
    press(eng, 'e');
    assert.deepEqual(eng.cursor, { x: 3, y: 0 });
    expectEngineToMatchText(eng, `
      Axis: horizontal

       1  1  .  C.  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
    `, { checkCursor: false });
    eng.cursor = { x: 4, y: 0 };
    press(eng, 'g', 'e');
    assert.deepEqual(eng.cursor, { x: 3, y: 0 });
    expectEngineToMatchText(eng, `
      Axis: horizontal

       1  1  .  C.  2  2
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
    `, { checkCursor: false });

    // Vertical runs with explicit cursor (current behavior keeps cursor anchored)
    setEngineFromText(eng, `
      Axis: vertical

      C7  .  .  .  .  .
       7  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       5  .  .  .  .  .
       5  .  .  .  .  .
    `);
    press(eng, 'w');
    assert.deepEqual(eng.cursor, { x: 0, y: 0 });
    expectEngineToMatchText(eng, `
      Axis: vertical

      C7  .  .  .  .  .
       7  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       5  .  .  .  .  .
       5  .  .  .  .  .
    `, { checkCursor: false });
    press(eng, 'w');
    assert.deepEqual(eng.cursor, { x: 0, y: 0 });
    expectEngineToMatchText(eng, `
      Axis: vertical

      C7  .  .  .  .  .
       7  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       5  .  .  .  .  .
       5  .  .  .  .  .
    `, { checkCursor: false });
    press(eng, 'b');
    assert.deepEqual(eng.cursor, { x: 0, y: 0 });
    expectEngineToMatchText(eng, `
      Axis: vertical

      C7  .  .  .  .  .
       7  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       5  .  .  .  .  .
       5  .  .  .  .  .
    `, { checkCursor: false });
    press(eng, 'e');
    assert.deepEqual(eng.cursor, { x: 0, y: 0 });
    expectEngineToMatchText(eng, `
      Axis: vertical

      C7  .  .  .  .  .
       7  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       5  .  .  .  .  .
       5  .  .  .  .  .
    `, { checkCursor: false });
    eng.cursor = { x: 0, y: 4 };
    press(eng, 'g', 'e');
    assert.deepEqual(eng.cursor, { x: 0, y: 0 });
    expectEngineToMatchText(eng, `
      Axis: vertical

      C7  .  .  .  .  .
       7  .  .  .  .  .
       .  .  .  .  .  .
       .  .  .  .  .  .
       5  .  .  .  .  .
       5  .  .  .  .  .
    `, { checkCursor: false });
  });

  it('gg and G jump to canvas bounds based on axis', () => {
    const eng = new TestableEngine({ width: 5, height: 4, palette: pico.colors });
    // Readable state; axis horizontal by default
    setEngineFromText(eng, `
Axis: horizontal

 .  .  .  .  2
 .  .  .  .  .
 .  .  .  .  .
 .  .  .  .  .
`);
    assert.equal(eng.axis, 'horizontal');
    eng.cursor = { x: 3, y: 2 };
    press(eng, 'g', 'g');
    assert.deepEqual(eng.cursor, { x: 0, y: 2 });
    press(eng, 'G');
    assert.deepEqual(eng.cursor, { x: 0, y: 2 });

    // Switch axis using helper
    setEngineFromText(eng, `
Axis: vertical

 .  .  .  .  .
 .  .  .  .  .
 .  .  .  .  .
 .  .  .  .  .
`);
    eng.cursor = { x: 2, y: 1 };
    press(eng, 'g', 'g');
    assert.deepEqual(eng.cursor, { x: 2, y: 0 });
    press(eng, 'G');
    assert.deepEqual(eng.cursor, { x: 2, y: 0 });
  });

  it('operator motions delete and change along axis', () => {
    const eng = new TestableEngine({ width: 6, height: 1, palette: pico.colors });
    setEngineFromText(eng, `
      Axis: horizontal, Color: 1

       1  1  .  .  2  2
    `);

    eng.cursor = { x: 0, y: 0 };
    press(eng, 'd', 'w');
    assert.deepEqual(eng.grid[0].slice(0, 6), [null, null, null, null, 2, 2]);
    assert.equal(eng.cursor.x, 0);

    press(eng, 'w', '.');
    assert.deepEqual(eng.grid[0].slice(0, 6), [null, null, null, null, null, null]);

    const engChange = new TestableEngine({ width: 4, height: 1, palette: pico.colors });
    setEngineFromText(engChange, `
      Axis: horizontal, Color: 3

       3  3  4  4
    `);
    engChange.cursor = { x: 0, y: 0 };
    press(engChange, 'c', 'w');
    assert.deepEqual(engChange.grid[0].slice(0, 4), [null, null, 4, 4]);

    const engDeleteToEnd = new TestableEngine({ width: 4, height: 1, palette: pico.colors });
    setEngineFromText(engDeleteToEnd, `
      Axis: horizontal, Color: 5

       5  5  6  6
    `);
    engDeleteToEnd.cursor = { x: 1, y: 0 };
    press(engDeleteToEnd, 'D');
    assert.deepEqual(engDeleteToEnd.grid[0].slice(0, 4), [5, null, null, null]);
  });

  it('repeat last action replays toggles and deletes', () => {
    const eng = new VPixEngine({ width: 4, height: 1, palette: pico.colors });
    press(eng, ' ');
    eng.cursor = { x: 1, y: 0 };
    press(eng, '.');
    assert.ok(eng.grid[0][1] != null);

    eng.grid[0].splice(0, 4, 1, 1, null, null);
    eng.cursor = { x: 0, y: 0 };
    press(eng, 'd', 'w');
    eng.cursor = { x: 2, y: 0 };
    press(eng, '.');
    assert.deepEqual(eng.grid[0].slice(0, 4), [null, null, null, null]);
  });

  it('u and Ctrl-r act as undo/redo aliases', () => {
    const eng = new VPixEngine({ width: 2, height: 1, palette: pico.colors });
    eng.paint();
    press(eng, 'u');
    assert.equal(eng.grid[0][0], null);
    press(eng, { key: 'r', ctrlKey: true });
    assert.ok(eng.grid[0][0] != null);
  });
});
