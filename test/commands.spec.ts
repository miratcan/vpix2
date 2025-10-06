import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import { executeCommand, type CommandResult } from '../core/commands';
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
    assert.ok(/pico-8/.test(res.msg));
  });

  it('set W and set H resize canvas, preserving pixels', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    eng.paint('#111111');
    eng.move(1, 0); eng.paint('#222222');
    let res = executeCommand(eng, 'set W 1') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng.width, 1);
    assert.equal(eng.grid[0][0], '#111111');
    res = executeCommand(eng, 'set H 3') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng.height, 3);
    assert.equal(eng.grid[0][0], '#111111');
    assert.equal(eng.grid[2][0], null);
  });

  it('set size <W>x<H> resizes both dimensions with crop/preserve', () => {
    const eng = new VPixEngine({ width: 3, height: 2, palette: pico.colors });
    eng.paint('#111111');
    eng.move(1, 0); eng.paint('#222222');
    eng.move(0, 1); eng.paint('#333333');
    const res = executeCommand(eng, 'set size 2x1') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng.width, 2);
    assert.equal(eng.height, 1);
    assert.equal(eng.grid[0][0], '#111111');
    assert.equal(eng.grid[0][1], '#222222');
  });

  it('set size <W>x<H> (without =) also works', () => {
    const eng = new VPixEngine({ width: 1, height: 1, palette: pico.colors });
    const res = executeCommand(eng, 'set size 4x3') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng.width, 4);
    assert.equal(eng.height, 3);
  });

  it('read json <...> replaces engine doc', () => {
    const eng = new VPixEngine({ width: 2, height: 1, palette: pico.colors });
    eng.paint('#123456');
    const json = eng.serialize();
    const eng2 = new VPixEngine({ width: 1, height: 1, palette: pico.colors });
    const res = executeCommand(eng2, `read json ${json}`) as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(eng2.width, 2);
    assert.equal(eng2.height, 1);
    assert.equal(eng2.grid[0][0], '#123456');
  });

  it('set size commands are silent and request terminal close', () => {
    const eng = new VPixEngine({ width: 2, height: 2, palette: pico.colors });
    const res = executeCommand(eng, 'set size 3x3') as CommandResult;
    assert.equal(res.ok, true);
    assert.equal(res.msg, '');
    assert.equal(res.meta?.silent, true);
    assert.equal(res.meta?.closeTerminal, true);
  });
});
