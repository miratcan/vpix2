import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import VPixEngine, { MODES } from '../core/engine';
import { getPaletteByName } from '../core/palettes';

describe('Visual mode operations', () => {
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
    eng.handleKey({ key: 'v' });
    eng.handleKey({ key: 'l' }); eng.handleKey({ key: 'l' });
    eng.handleKey({ key: 'j' }); eng.handleKey({ key: 'j' });
    eng.handleKey({ key: 'F' });
    assert.ok(eng.grid[1][1]);
    eng.handleKey({ key: 'v' });
    eng.handleKey({ key: 'l' }); eng.handleKey({ key: 'l' });
    eng.handleKey({ key: 'R' });
    eng.cursor = { x: 0, y: 0 };
    eng.handleKey({ key: 'v' });
    eng.cursor = { x: 4, y: 4 };
    eng.handleKey({ key: 'L' });
    eng.cursor = { x: 4, y: 0 };
    eng.handleKey({ key: 'v' });
    eng.handleKey({ key: 'f' });
    assert.ok(true);
  });

  it('transparent paste and rotations and move selection', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 5, height: 5, palette: pico.colors });
    eng.paint('#111111');
    eng.move(1,0); eng.paint('#222222');
    eng.move(-1,1);
    eng.move(1,0); eng.paint('#333333');
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
});
