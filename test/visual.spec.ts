import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import VPixEngine, { MODES } from '../core/engine';
import { getPaletteByName } from '../core/palettes';

describe('Visual mode operations', () => {
  const press = (
    engine: VPixEngine,
    ...keys: Array<string | { key: string; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; metaKey?: boolean }>
  ) => {
    keys.forEach((key) => {
      if (typeof key === 'string') engine.handleKey({ key });
      else engine.handleKey(key);
    });
  };

  it('enters visual and yanks/deletes/pastes', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 4, height: 2, palette: pico.colors });
    eng.paint('#111111');
    eng.move(1, 0); eng.paint('#222222');
    eng.cursor = { x: 0, y: 0 };
    eng.enterVisual();
    assert.equal(eng.mode, MODES.VISUAL);
    eng.cursor = { x: 1, y: 0 };
    eng.updateSelectionRect();
    eng.yankSelection();
    eng.exitVisual();
    eng.cursor = { x: 0, y: 1 };
    eng.pasteAtCursor();
    assert.equal(eng.grid[1][0], '#111111');
    assert.equal(eng.grid[1][1], '#222222');
    eng.cursor = { x: 0, y: 0 };
    eng.enterVisual();
    eng.cursor = { x: 1, y: 0 };
    eng.updateSelectionRect();
    eng.deleteSelection();
    eng.exitVisual();
    assert.equal(eng.grid[0][0], null);
    assert.equal(eng.grid[0][1], null);
  });

  it('fill, stroke rect, line, flood fill', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 5, height: 5, palette: pico.colors });
    press(eng, 'v', 'l', 'l', 'j', 'j', 'F');
    assert.ok(eng.grid[1][1] != null);
    press(eng, 'v', 'l', 'l', 'R');
    eng.cursor = { x: 0, y: 0 };
    press(eng, 'v');
    eng.cursor = { x: 4, y: 4 };
    press(eng, 'L');
    eng.cursor = { x: 4, y: 0 };
    press(eng, 'v', 'f');
    assert.ok(true);
  });

  it('stroke and fill circle selections', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 7, height: 7, palette: pico.colors });
    press(eng, 'v', 'l', 'l', 'l', 'l', 'j', 'j', 'j', 'j', 'C');
    assert.equal(eng.mode, MODES.NORMAL);
    assert.ok(eng.grid[0][2] != null);
    assert.ok(eng.grid[2][0] != null);
    assert.equal(eng.grid[2][2], null);

    eng.cursor = { x: 0, y: 0 };
    press(eng, 'v', 'l', 'l', 'l', 'l', 'j', 'j', 'j', 'j', 'O');
    assert.equal(eng.mode, MODES.NORMAL);
    assert.ok(eng.grid[2][2] != null);
  });

  it('transparent paste and rotations and move selection', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 5, height: 5, palette: pico.colors });
    eng.paint();
    eng.move(1,0); eng.paint();
    eng.move(-1,1);
    eng.move(1,0); eng.paint();
    eng.cursor = { x: 0, y: 0 };
    eng.enterVisual();
    eng.cursor = { x: 1, y: 1 };
    eng.updateSelectionRect();
    eng.yankSelection();
    eng.exitVisual();
    eng.rotateClipboardCW();
    eng.cursor = { x: 2, y: 0 };
    eng.pasteAtCursorTransparent();
    eng.cursor = { x: 0, y: 3 };
    eng.enterVisual();
    eng.cursor = { x: 1, y: 1 };
    eng.updateSelectionRect();
    eng.cursor = { x: 0, y: 3 };
    eng.moveSelectionToCursor();
    eng.exitVisual();
    assert.ok(true);
  });

  it('fill selection only fills selected area and returns to normal mode', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 5, height: 5, palette: pico.colors });

    // Set color index to 3
    eng.setColorIndex(3);

    // Enter visual mode at (1,1)
    eng.cursor = { x: 1, y: 1 };
    eng.enterVisual();
    assert.equal(eng.mode, MODES.VISUAL);

    // Select to (3,3) - a 3x3 area
    eng.cursor = { x: 3, y: 3 };
    eng.updateSelectionRect();

    // Fill the selection
    eng.fillSelection();
    eng.exitVisual();

    // Should be back in normal mode
    assert.equal(eng.mode, MODES.NORMAL);

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
    eng.move(1, 0); // move right
    assert.equal(eng.grid[0][0], null); // should still be null
    assert.equal(eng.grid[0][1], null); // should still be null

    eng.move(0, 1); // move down
    assert.equal(eng.grid[1][1], 3); // this was already filled, shouldn't change
    assert.equal(eng.grid[1][0], null); // this should still be null
  });

  it('user scenario: visual fill via keyboard then move in normal mode', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 10, height: 10, palette: pico.colors });

    // User sets color to index 5
    press(eng, '6', 'g', 'c'); // select color (index 5, because count-1)
    assert.equal(eng.currentColorIndex, 5);

    // User enters visual mode at (2,2)
    eng.cursor = { x: 2, y: 2 };
    press(eng, 'v');
    assert.equal(eng.mode, MODES.VISUAL);

    // User selects area: move right twice, down twice -> (4,4)
    press(eng, 'l', 'l', 'j', 'j');
    assert.equal(eng.cursor.x, 4);
    assert.equal(eng.cursor.y, 4);

    // User fills with F
    press(eng, 'F');

    // Should be back in normal mode
    assert.equal(eng.mode, MODES.NORMAL, 'Should be in NORMAL mode after fill');

    // Check fill worked correctly (3x3 area from 2,2 to 4,4)
    assert.equal(eng.grid[2][2], 5);
    assert.equal(eng.grid[3][3], 5);
    assert.equal(eng.grid[4][4], 5);

    // Check outside area is NOT filled
    assert.equal(eng.grid[0][0], null);
    assert.equal(eng.grid[5][5], null);

    // User moves cursor with hjkl in normal mode - should NOT paint
    eng.cursor = { x: 0, y: 0 };
    press(eng, 'l'); // move right
    assert.equal(eng.grid[0][0], null, 'Moving in normal mode should not paint');

    press(eng, 'j'); // move down
    assert.equal(eng.grid[1][0], null, 'Moving in normal mode should not paint');

    press(eng, 'l'); // move right again
    assert.equal(eng.grid[1][1], null, 'Moving in normal mode should not paint');
  });

  it('user scenario: visual flood fill (lowercase f) should only fill selected area', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 10, height: 10, palette: pico.colors });

    // User sets color to index 5
    press(eng, '6', 'g', 'c'); // select color (index 5, because count-1)
    assert.equal(eng.currentColorIndex, 5);

    // User enters visual mode at (2,2)
    eng.cursor = { x: 2, y: 2 };
    press(eng, 'v');
    assert.equal(eng.mode, MODES.VISUAL);

    // User selects area: move right twice, down twice -> (4,4)
    press(eng, 'l', 'l', 'j', 'j');

    // User does flood fill with lowercase f
    press(eng, 'f');

    // Should be back in normal mode
    assert.equal(eng.mode, MODES.NORMAL, 'Should be in NORMAL mode after flood fill');

    // Flood fill should respect selection bounds
    let filledCount = 0;
    for (let y = 0; y < eng.height; y++) {
      for (let x = 0; x < eng.width; x++) {
        if (eng.grid[y][x] === 5) filledCount++;
      }
    }

    // Should only fill the selected 3x3 area (9 cells)
    assert.equal(filledCount, 9, 'Flood fill should only fill within selection bounds');

    // Verify specific cells
    assert.equal(eng.grid[2][2], 5); // inside selection
    assert.equal(eng.grid[4][4], 5); // inside selection
    assert.equal(eng.grid[0][0], null); // outside selection
    assert.equal(eng.grid[5][5], null); // outside selection
  });

  it('paste works in normal mode with p key', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 10, height: 10, palette: pico.colors });

    // Create a 2x2 pattern
    eng.setColorIndex(3);
    eng.cursor = { x: 0, y: 0 };
    eng.paint();
    eng.cursor = { x: 1, y: 0 };
    eng.paint();
    eng.cursor = { x: 0, y: 1 };
    eng.paint();
    eng.cursor = { x: 1, y: 1 };
    eng.paint();

    // Yank it with visual mode
    eng.cursor = { x: 0, y: 0 };
    eng.enterVisual();
    eng.cursor = { x: 1, y: 1 };
    eng.updateSelectionRect();
    eng.yankSelection();
    eng.exitVisual();

    // Should be in normal mode
    assert.equal(eng.mode, MODES.NORMAL);

    // Move to different position and paste with p
    eng.cursor = { x: 5, y: 5 };
    press(eng, 'p');

    // Should still be in normal mode
    assert.equal(eng.mode, MODES.NORMAL, 'Should remain in normal mode after paste');

    // Check paste worked
    assert.equal(eng.grid[5][5], 3);
    assert.equal(eng.grid[6][5], 3);
    assert.equal(eng.grid[5][6], 3);
    assert.equal(eng.grid[6][6], 3);
  });

  it('x key cuts cell (delete and yank to clipboard)', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 10, height: 10, palette: pico.colors });

    // Paint a cell
    eng.setColorIndex(7);
    eng.cursor = { x: 2, y: 3 };
    eng.paint();
    assert.equal(eng.grid[3][2], 7);

    // Cut it with x
    press(eng, 'x');

    // Should be erased
    assert.equal(eng.grid[3][2], null, 'Cell should be erased after cut');

    // Should be in clipboard - paste it somewhere else
    eng.cursor = { x: 5, y: 5 };
    press(eng, 'p');

    // Should be pasted
    assert.equal(eng.grid[5][5], 7, 'Cut cell should be in clipboard and pasteable');
    assert.equal(eng.mode, MODES.NORMAL);
  });
});
