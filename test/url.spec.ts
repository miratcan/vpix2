import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import VPixEngine from '../core/engine';
import { getPaletteByName } from '../core/palettes';
import { encodeToParamV2R, decodeFromParamV2R } from '../core/url';

describe('URL encode/decode', () => {
  it('vp2r: RLE over packed bytes yields compact zero-runs and decodes', () => {
    const pico = getPaletteByName('pico-8')!;
    const eng = new VPixEngine({ width: 16, height: 16, palette: pico.colors });
    const payload = encodeToParamV2R(eng, 'pico-8');
    const rPart = payload.split(';').find((t) => t.startsWith('r')) || '';
    if (rPart) { const body = rPart.slice(1); if (body.length > 0) { if (body[0] !== 'z') throw new Error('vp2r did not start with zero-run for empty canvas'); } }
    const eng2 = decodeFromParamV2R(payload, VPixEngine)!;
    assert.equal(eng2.grid.width, 16);
    assert.equal(eng2.grid.height, 16);
    assert.equal(eng2.grid.cells[0][0], null);
  });
});
