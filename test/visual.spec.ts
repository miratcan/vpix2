import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import VPixEngine, { MODES } from '../core/engine';
import { getPaletteByName } from '../core/palettes';
import { runCommand } from '../core/commands';

describe('Visual mode operations', () => {
  it('enters visual and yanks/deletes/pastes', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 4, height: 2, palette: pico.colors });
    eng.paint(1);
    eng.move(1, 0); eng.paint(2);
    eng.cursor = { x: 0, y: 0 };
    runCommand(eng, 'mode.visual');
    assert.equal(eng.getMode(), MODES.VISUAL);
    eng.cursor = { x: 1, y: 0 };
    eng.updateSelectionRect();
    runCommand(eng, 'selection.yank');
    eng.cursor = { x: 0, y: 1 };
    runCommand(eng, 'clipboard.paste');
    assert.equal(eng.grid[1][0], 1);
    assert.equal(eng.grid[1][1], 2);
    eng.cursor = { x: 0, y: 0 };
    runCommand(eng, 'mode.visual');
    eng.cursor = { x: 1, y: 0 };
    eng.updateSelectionRect();
    runCommand(eng, 'selection.delete');
    assert.equal(eng.grid[0][0], null);
    assert.equal(eng.grid[0][1], null);
  });

  it('fill selection only fills selected area and returns to normal mode', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 5, height: 5, palette: pico.colors });

    // Set color index to 3
    eng.setColorIndex(3);

    // Enter visual mode at (1,1)
    eng.cursor = { x: 1, y: 1 };
    runCommand(eng, 'mode.visual');
    assert.equal(eng.getMode(), MODES.VISUAL);

    // Select to (3,3) - a 3x3 area
    eng.cursor = { x: 3, y: 3 };
    eng.updateSelectionRect();

    // Fill the selection
    runCommand(eng, 'selection.fill');

    // Should be back in normal mode
    assert.equal(eng.getMode(), MODES.NORMAL);

    // Check that only the selected area (1,1) to (3,3) is filled
    assert.equal(eng.grid[1][1], 3); // inside selection
    assert.equal(eng.grid[2][2], 3); // inside selection
    assert.equal(eng.grid[3][3], 3); // inside selection

    // Check that cells outside selection are NOT filled
    assert.equal(eng.grid[0][0], null); // outside selection
    assert.equal(eng.grid[0][1], null); // outside selection
    assert.equal(eng.grid[4][4], null); // outside selection
    assert.equal(eng.grid[4][0], null); // outside selection

    // Move cursor and verify it doesn't paint while moving in normal mode
    eng.cursor = { x: 0, y: 0 };
    runCommand(eng, 'cursor.move-right'); // move right
    assert.equal(eng.grid[0][0], null); // should still be null
    assert.equal(eng.grid[0][1], null); // should still be null

    runCommand(eng, 'cursor.move-down'); // move down
    assert.equal(eng.grid[1][1], 3); // this was already filled, shouldn't change
    assert.equal(eng.grid[1][0], null); // this should still be null
  });
});