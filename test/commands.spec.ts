import { strict as assert } from 'node:assert';
import { describe, it, vi } from 'vitest';

import { executeCommand, type CommandResult, COMMAND_DEFINITIONS } from '../core/commands';
import VPixEngine from '../core/engine';
import { getPaletteByName } from '../core/palettes';

describe('Command execution', () => {
  const pico = getPaletteByName('pico-8')!;
  it('palette use <name> switches to registry palette', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    const res = executeCommand(eng, 'palette use pico-8') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng.palette.length, 16);
  });

  it('palette list returns registry names', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    const res = executeCommand(eng, 'palette list') as CommandResult;
    assert.equal(res.ok, true);
    assert.ok(res.meta?.lines?.some(line => /pico-8/.test(line)));
  });

  it('set W and set H resize canvas, preserving pixels', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    eng.paint('#111111');
    eng.move(1, 0); eng.paint('#222222');
    let res = executeCommand(eng, 'set W 1') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng.grid.width, 1);
    assert.equal(eng.grid.cells[0][0], '#111111');
    res = executeCommand(eng, 'set H 3') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng.grid.height, 3);
    assert.equal(eng.grid.cells[0][0], '#111111');
    assert.equal(eng.grid.cells[2][0], null);
  });

  it('set size <W>x<H> resizes both dimensions with crop/preserve', () => {
    const eng = new VPixEngine({ width: 3, height: 2, palette: pico.colors });
    eng.paint('#111111');
    eng.move(1, 0); eng.paint('#222222');
    eng.move(0, 1); eng.paint('#333333');
    const res = executeCommand(eng, 'set size 2x1') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng.grid.width, 2);
    assert.equal(eng.grid.height, 1);
    assert.equal(eng.grid.cells[0][0], '#111111');
    assert.equal(eng.grid.cells[0][1], '#222222');
  });

  it('set size <W>x<H> (without =) also works', () => {
    const eng = new VPixEngine({ width: 1, height: 1, palette: pico.colors });
    const res = executeCommand(eng, 'set size 4x3') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng.grid.width, 4);
    assert.equal(eng.grid.height, 3);
  });

  it('read json <...> replaces engine doc', () => {
    const eng = new VPixEngine({ width: 2, height: 1, palette: pico.colors });
    eng.paint('#123456');
    const json = eng.serialize();
    const eng2 = new VPixEngine({ width: 1, height: 1, palette: pico.colors });
    const res = executeCommand(eng2, `read json ${json}`) as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng2.grid.width, 2);
    assert.equal(eng2.grid.height, 1);
    assert.equal(eng2.grid.cells[0][0], '#123456');
  });

  it('set size command resizes canvas and gives feedback', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    const res = executeCommand(eng, 'set size 3x3') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(res.msg, 'Canvas size set to 3x3.');
    assert.equal(res.meta?.closeTerminal, true);
  });

  describe('Command execution with history', () => {
    const pico = getPaletteByName('pico-8')!;

    it('should create a history group for a successful command', () => {
      const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
      const beginGroupSpy = vi.spyOn(eng.history, 'beginGroup');
      const endGroupSpy = vi.spyOn(eng.history, 'endGroup');

      executeCommand(eng, 'clear');

      assert.equal(beginGroupSpy.mock.calls.length, 1);
      assert.equal(endGroupSpy.mock.calls.length, 1);
    });

    it('should not create a history group for a failed command', () => {
      const clearCommandDef = COMMAND_DEFINITIONS.find(def => def.id === 'canvas.clear');
      assert.ok(clearCommandDef, 'Could not find canvas.clear command definition');

      const handlerSpy = vi.spyOn(clearCommandDef, 'handler').mockImplementation(() => {
        throw new Error('Handler failed for test');
      });

      const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
      const beginGroupSpy = vi.spyOn(eng.history, 'beginGroup');
      const endGroupSpy = vi.spyOn(eng.history, 'endGroup');

      const res = executeCommand(eng, 'clear') as CommandResult;

      assert.equal(res.ok, false);
      assert.equal(beginGroupSpy.mock.calls.length, 1);
      assert.equal(endGroupSpy.mock.calls.length, 0);

      handlerSpy.mockRestore();
    });
  });

  it('new command clears canvas, resets palette, and resets cursor', () => {
    const eng = new VPixEngine({ width: 5, height: 5, palette: pico.colors });

    // Make some changes
    eng.paint(3);
    eng.move(1, 1);
    eng.paint(5);
    eng.cursor.setPosition(2, 2);
    eng.setColorIndex(7);

    // Verify changes were made
    assert.equal(eng.grid.cells[0][0], 3);
    assert.equal(eng.grid.cells[1][1], 5);
    assert.equal(eng.cursor.x, 2);
    assert.equal(eng.cursor.y, 2);
    assert.equal(eng.currentColorIndex, 7);

    // Execute new command
    const result = executeCommand(eng, 'new') as CommandResult;
    assert.ok(result, 'Command should return a result');
    assert.equal(result.ok, true, 'Command should succeed');

    // Verify everything was reset
    assert.equal(eng.grid.cells[0][0], null, 'Canvas should be cleared');
    assert.equal(eng.grid.cells[1][1], null, 'Canvas should be cleared');
    assert.equal(eng.cursor.x, 0, 'Cursor should be at origin');
    assert.equal(eng.cursor.y, 0, 'Cursor should be at origin');
    assert.equal(eng.currentColorIndex, 0, 'Color should be reset to 0');
    assert.deepEqual(eng.palette, pico.colors, 'Palette should be reset to pico-8');
    assert.ok(result.msg.includes('Started new document'), 'Should return success message');
  });
});
