// URL encode/decode (vp2r only) using LoSpec palette slug + bit-packed pixels
import { getPaletteByName, normalizeSlug } from './palettes';
import { base64UrlDecodeToBytes, base64UrlEncode } from './url/base64url';
import { fromB62, toB62 } from './url/base62';

import type VPixEngine from './engine';

export function parseVp2Meta(value: string) {
  const s = (value || '').trim(); if (!s.startsWith('vp2r;')) return null;
  const parts = s.split(';'); let w = 0, h = 0, slug: string | null = null;
  for (const token of parts) {
    if (token.startsWith('w')) w = fromB62(token.slice(1));
    else if (token.startsWith('h')) h = fromB62(token.slice(1));
    else if (token.startsWith('pl')) slug = token.slice(2);
  }
  if (!w || !h || !slug) return null; return { w, h, slug } as const;
}

export function encodeToParamV2R(engine: VPixEngine, paletteSlug?: string) {
  const { grid, palette, currentColorIndex: cidx } = engine;
  const w = grid.width;
  const h = grid.height;
  const slug = normalizeSlug(paletteSlug) || 'pico-8';
  const nColors = palette.length; const bitsPer = Math.max(1, Math.ceil(Math.log2(nColors + 1)));
  const total = w * h; const totalBits = total * bitsPer; const bytes = new Uint8Array(Math.ceil(totalBits / 8));
  let bitPos = 0;
  const writeVal = (v: number) => { for (let b = bitsPer - 1; b >= 0; b--) { const bit = (v >> b) & 1; const byteIndex = bitPos >> 3; const bitIndex = 7 - (bitPos & 7); bytes[byteIndex] |= bit << bitIndex; bitPos++; } };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = engine.grid.cells[y][x]; const idx = c == null ? 0 : c + 1; writeVal(idx); }
  const segs: string[] = [];
  for (let i = 0; i < bytes.length;) {
    if (bytes[i] === 0) { let j = i; while (j < bytes.length && bytes[j] === 0) j++; const count = j - i; segs.push(`z${toB62(count)}`); i = j; }
    else { let j = i; while (j < bytes.length && bytes[j] !== 0) j++; const len = j - i; const chunk = bytes.subarray(i, j); segs.push(`d${toB62(len)}:${base64UrlEncode(chunk)}`); i = j; }
  }
  const r = segs.join('.'); return `vp2r;w${toB62(w)};h${toB62(h)};pl${slug};d${toB62(bitsPer)};c${toB62(cidx)};r${r}`;
}

export function decodeFromParamV2R(value: string, engineClass: new (opts: { width: number; height: number; palette: string[] }) => VPixEngine) {
  const s = (value || '').trim(); if (!s.startsWith('vp2r;')) return null;
  const parts = s.split(';'); let w = 0, h = 0, slug: string | null = null, r = '', bitsPer = 0, cidx = 0;
  for (const token of parts) {
    if (token.startsWith('w')) w = fromB62(token.slice(1)); else if (token.startsWith('h')) h = fromB62(token.slice(1)); else if (token.startsWith('pl')) slug = token.slice(2); else if (token.startsWith('r')) r = token.slice(1); else if (token.startsWith('d')) bitsPer = fromB62(token.slice(1)); else if (token.startsWith('c')) cidx = fromB62(token.slice(1));
  }
  if (!w || !h || !slug || bitsPer <= 0) return null; const pal = getPaletteByName(slug); if (!pal) return null;
  const total = Math.ceil((w * h * bitsPer) / 8); const out = new Uint8Array(total); let offset = 0;
  if (r && r.length) {
    for (const seg of r.split('.')) {
      if (!seg) continue; if (seg[0] === 'z') { const count = fromB62(seg.slice(1)); offset += count; }
      else if (seg[0] === 'd') { const rest = seg.slice(1); const idx = rest.indexOf(':'); if (idx === -1) continue; const len = fromB62(rest.slice(0, idx)); const b64 = rest.slice(idx + 1); const chunk = base64UrlDecodeToBytes(b64); const copyLen = Math.min(len, chunk.length, total - offset); out.set(chunk.subarray(0, copyLen), offset); offset += copyLen; }
      if (offset >= total) break;
    }
  }
  const eng = new engineClass({ width: w, height: h, palette: pal.colors });
  eng.currentColorIndex = cidx;
  let bitPos = 0; const readVal = () => { let v = 0; for (let b = 0; b < bitsPer; b++) { const byteIndex = bitPos >> 3; const bitIndex = 7 - (bitPos & 7); const bit = (out[byteIndex] >> bitIndex) & 1; v = (v << 1) | bit; bitPos++; } return v; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = readVal(); (eng as any).grid.writeCell(x, y, v === 0 ? null : (v - 1)); }
  return eng;
}

// Legacy decoder for older links using the non-run-length encoded 'vp2' format.
// Format: vp2;w<w>;h<h>;pl<slug>;d<bitsPer>;c<currentColorIndex>;b<base64url-bytes>
// Note: legacy 'vp2' decoder intentionally not exported. No backwards compatibility.
