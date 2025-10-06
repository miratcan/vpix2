import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import VPixEngine from '../core/engine';
import { getPaletteByName } from '../core/palettes';
import { encodeToParamV2, decodeFromParamV2, encodeToParamV2R, decodeFromParamV2R } from '../core/url';

describe('URL encode/decode', () => {
  it('vp2: encodes with palette slug + bit packing and decodes', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 3, height: 2, palette: pico.colors });
    eng.setPalette([...pico.colors]);
    eng.setColorIndex(2);
    eng.paint();
    eng.move(1, 0); eng.paint();
    const payload = encodeToParamV2(eng, 'pico-8');
    const eng2 = decodeFromParamV2(payload, (opts) => new VPixEngine(opts))!;
    assert.equal(eng2.width, 3);
    assert.equal(eng2.height, 2);
    assert.equal(eng2.palette.length, 16);
    assert.equal(eng2.grid[0][0], eng.grid[0][0]);
    assert.equal(eng2.grid[0][1], eng.grid[0][1]);
  });

  it('vp2r: RLE over packed bytes yields compact zero-runs and decodes', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 16, height: 16, palette: pico.colors });
    const payload = encodeToParamV2R(eng, 'pico-8');
    const rPart = payload.split(';').find((t) => t.startsWith('r')) || '';
    if (rPart) { const body = rPart.slice(1); if (body.length > 0) { if (body[0] !== 'z') throw new Error('vp2r did not start with zero-run for empty canvas'); } }
    const eng2 = decodeFromParamV2R(payload, (opts) => new VPixEngine(opts))!;
    assert.equal(eng2.width, 16);
    assert.equal(eng2.height, 16);
    assert.equal(eng2.grid[0][0], null);
  });
});
