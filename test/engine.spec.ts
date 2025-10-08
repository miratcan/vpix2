import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import VPixEngine, { MODES } from '../core/engine';
import { getPaletteByName } from '../core/palettes';
import { runCommand } from '../core/commands';

describe('VPixEngine', () => {
  const pico = getPaletteByName('pico-8')!;

  it('initializes with correct defaults', () => {
    const eng = new VPixEngine({ width: 8, height: 8, palette: pico.colors });
    assert.equal(eng.width, 8);
    assert.equal(eng.height, 8);
    assert.equal(eng.getMode(), MODES.NORMAL);
    assert.deepEqual(eng.cursor, { x: 0, y: 0 });
    assert.equal(eng.grid.length, 8);
    assert.equal(eng.grid[0].length, 8);
  });

  it('moves cursor with hjkl and clamps bounds', () => {
    const eng = new VPixEngine({ width: 3, height: 2, palette: pico.colors });
    runCommand(eng, 'cursor.move-right');
    runCommand(eng, 'cursor.move-right');
    runCommand(eng, 'cursor.move-right');
    assert.deepEqual(eng.cursor, { x: 2, y: 0 });
    runCommand(eng, 'cursor.move-down');
    runCommand(eng, 'cursor.move-down');
    assert.deepEqual(eng.cursor, { x: 2, y: 1 });
    runCommand(eng, 'cursor.move-left');
    runCommand(eng, 'cursor.move-up');
    assert.deepEqual(eng.cursor, { x: 1, y: 0 });
  });

  it('erases with x in normal mode', () => {
    const eng = new VPixEngine({ width: 2, height: 1, palette: pico.colors });
    eng.paint();
    assert.ok(eng.grid[0][0] != null);
    runCommand(eng, 'paint.cut');
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

  it('Ctrl-^ toggles last color', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    eng.setColorIndex(4);
    eng.setColorIndex(1);
    runCommand(eng, 'palette.swap-last-color');
    assert.equal(eng.currentColorIndex, 4);
    runCommand(eng, 'palette.swap-last-color');
    assert.equal(eng.currentColorIndex, 1);
  });

  it('axis defaults to horizontal and toggles with Tab', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    assert.equal((eng as any).axis, 'horizontal');
    runCommand(eng, 'axis.toggle');
    assert.equal((eng as any).axis, 'vertical');
    runCommand(eng, 'axis.toggle');
    assert.equal((eng as any).axis, 'horizontal');
  });

  it('u and Ctrl-r act as undo/redo aliases', () => {
    const eng = new VPixEngine({ width: 2, height: 1, palette: pico.colors });
    eng.paint();
    runCommand(eng, 'history.undo');
    assert.equal(eng.grid[0][0], null);
    runCommand(eng, 'history.redo');
    assert.ok(eng.grid[0][0] != null);
  });
});